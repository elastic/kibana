# ES service-account workload execution — implementation plan

Issue: [elastic/kibana#284466](https://github.com/elastic/kibana/issues/284466)

Research date: 2026-09-23. Local baseline: `112bfdc9ede2` (Kibana 9.6.0).

Status: implemented with the agreed scope. The research below describes the starting point; implementation and validation results are recorded at the end.

## Decisions from this discussion

| Topic | Decision |
| --- | --- |
| End-to-end scope | Include ES-backed workload binding and execution. |
| Exchange API | Use the new `_user_managed_service_account` grant. Re-exchange the stored credential to renew; no refresh token. The issue's token-pair wording is outdated. |
| Revocation | Option 1: deny further exchanges after revocation is detected; let issued tokens expire naturally. Preserve the configured ES token lifetime. No immediate or background invalidation. |
| Kibana HTTP calls | Defer self-client renewal to #290877 / PR #290990. It is not a dependency or acceptance criterion for this issue. |
| Release and flag | Target Kibana/Elasticsearch 9.6 only. Preserve the existing default-off flag. |

## What the research established

### Elasticsearch has the required grant

[Elasticsearch PR #159157](https://github.com/elastic/elasticsearch/pull/159157), merged September 15 and labeled 9.6.0, added:

```http
POST /_security/oauth2/token
Authorization: <Kibana's internal Elasticsearch authentication>
Content-Type: application/json

{
  "grant_type": "_user_managed_service_account",
  "service_account_token": "<decrypted long-lived service-account token>"
}
```

The response contains `access_token`, `type`, `expires_in`, and `authentication`; it deliberately has no refresh token. Elasticsearch independently authenticates the credential in the body and returns the service account's identity and privileges. The broker needs `manage_token`; the service account does not.

The merged tests establish that built-in accounts are rejected, a disabled account cannot exchange again, and an already-issued token remains valid after disabling until expiration or explicit invalidation. Using `client_credentials` would be incorrect: it represents the caller and cannot be used to self-mint as the service account.

Kibana's system user has `manage_token` in [KibanaOwnedReservedRoleDescriptors](https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/KibanaOwnedReservedRoleDescriptors.java). The built-in `elastic/kibana` account uses that same role descriptor in [ElasticServiceAccounts](https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/security/src/main/java/org/elasticsearch/xpack/security/authc/service/ElasticServiceAccounts.java). It can therefore act as broker; the prohibition on exchanging built-in accounts applies to the subject credential.

[Elasticsearch PR #159397](https://github.com/elastic/elasticsearch/pull/159397) removed the token-service license restriction. Token-service enablement and HTTP TLS requirements remain. Test the Basic-license path against a build containing both changes.

### Kibana execution plumbing at the research baseline

- [ES backend](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/service_accounts/es_service_accounts.ts): creation persists an encrypted long-lived token. `createFakeRequest` throws 501, `reauthenticateFakeRequest` returns null, and `releaseFakeRequest` is a no-op.
- [Credential store](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/service_accounts/credentials/credential_store.ts): `getDecrypted` already returns verified credentials, distinguishes missing credentials, and rejects missing encrypted tokens or integrity failures.
- [Service startup](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/service_accounts/service_accounts_service.ts): selects ES outside Serverless, but returns `createNotImplementedWorkloadBindings` for ES.
- [Fake-request registry](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/service_accounts/fake_requests.ts): owns request credentials, coalesces concurrent renewal, backs off transient failures, stops on terminal failures, and calls a mint interceptor before exchanges. It is an in-memory `WeakMap`, not a cross-node token inventory.
- [Workload execution](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/service_accounts/bindings/workload_bindings.ts): verifies the binding, mints a scoped request, checks the binding before renewal, and releases the request in `finally`. Release currently strips local headers; it does not invalidate an ES token.
- [ES unauthorized handler](/Users/larry/.codex/worktrees/d65b/kibana/x-pack/platform/plugins/shared/security/server/authentication/authentication_service.ts): already routes recognized token-expiry failures on fake requests to the selected backend. It deliberately does not renew arbitrary 401 responses.
- [Core self-client](/Users/larry/.codex/worktrees/d65b/kibana/src/core/packages/http/server-internal/src/self_client.ts): this checkout has no automatic renewal. [PR #290990](https://github.com/elastic/kibana/pull/290990) is open and implements it, including one retry only for an authentication-stage rejection. This is separate follow-up work and is not a prerequisite for this issue.

The existing `requestLifetime` setting defaults to ten minutes and limits renewal of standalone synthetic requests. Workload execution deliberately supplies an unlimited lease with a binding-verification interceptor instead. Neither value changes the Elasticsearch access-token expiry.

### Related work

- [#284464](https://github.com/elastic/kibana/issues/284464): ES account creation, closed.
- [#284465](https://github.com/elastic/kibana/issues/284465): UIAM ephemeral requests and renewal, closed.
- [#286916](https://github.com/elastic/kibana/issues/286916): durable workload bindings, closed. Its original API names differ from the current checkout; use current Core contracts.
- [#290877](https://github.com/elastic/kibana/issues/290877), [PR #290990](https://github.com/elastic/kibana/pull/290990): self-client renewal, deferred from this plan.
- [PR #292599](https://github.com/elastic/kibana/pull/292599): Workflows adoption, open. It explicitly depends on this ES adapter and self-client renewal. Its proposed expected-account check and binding-store space fix must be reconciled at implementation time.
- [#286191](https://github.com/elastic/kibana/issues/286191): broader service-account auditing, separate open work.

## Implementation sequence

### 1. Verify the runtime contract

Use an ES 9.6 build containing the new grant and token-service license change. Verify exchange under both supported Kibana internal identities (`kibana_system` and `elastic/kibana`) with a service account that has narrowly scoped roles and no token-management privilege.

Confirm response identity, token expiry, disabled/deleted account and deleted-credential failures, and actual error payloads. Confirm Basic licensing and token-service-disabled behavior. Do not resolve a missing grant by falling back to the long-lived credential or granting the service account `manage_token`.

Inspect the installed Elasticsearch client's request types during implementation. This checkout pins client 9.5.0. If the generated API does not support the new grant and body field, use the existing local pattern of a typed `asInternalUser.transport.request` to the fixed token endpoint. Do not suppress type errors or cast an unsupported grant into an old enum.

### 2. Implement the ES exchange adapter

In `EsServiceAccounts`:

1. Accept `requestLifetimeMs` and construct `ServiceAccountFakeRequests`, as the UIAM backend does.
2. Add a private exchange method. Check security availability and `canEncrypt`; validate the account identifier and retrieve its credential through `credentialStore.getDecrypted`.
3. Treat missing, inconsistent, or unverifiable credentials as a refusal. Check stored identity fields against the requested account. Never use another identity as a fallback.
4. Exchange through `clusterClient.asInternalUser`. The long-lived credential belongs only in `service_account_token`, never in workload headers.
5. Trust Elasticsearch's token response and use the generated response type; do not add runtime response validation.
6. Return only the access token to the request machinery, without introducing a persistent access-token inventory. Do not persist a refresh token or repurpose the browser-session `Tokens` helper.
7. Implement create, reauthenticate, and release through the registry, preserving existing request ownership, space scoping, renewal leases, single-flight renewal, and terminal-failure behavior.

Normalize failures into `ServiceAccountTokenExchangeError` so a temporary ES or credential-store outage does not permanently disable a running workload. Explicitly classify known transient transport failures, 408/429 and retryable server failures; missing credentials, invalid grants, disabled accounts, authorization refusals, and integrity failures are terminal. Honor a valid Retry-After header where available. Log inconsistent credential identity fields with expected and actual values. Keep token values, upstream request bodies, and raw errors out of logs and HTTP responses.

### 3. Enable ES workload bindings

Construct `ServiceAccountWorkloadBindings` for either selected backend and remove the ES-only 501 implementation once it has no callers. Keep backend selection based on deployment type.

Preserve the current authorization boundaries: Core supplies the plugin identity, workloads are scoped by plugin/type/id/space, and bind/unbind require `manage_security`. Workload consumers remain responsible for their own execute authorization. Use explicit namespaces for binding access and reconcile the open Workflows PR's Spaces-extension fix.

Update stale comments and directory type documentation that say ES accounts are merely ready to be assumed. No new public raw-token endpoint is needed.

### 4. Deferred: self-client renewal

Self-client renewal remains in [#290877](https://github.com/elastic/kibana/issues/290877) / [PR #290990](https://github.com/elastic/kibana/pull/290990). It is not required to complete this issue. Preserve compatibility with that work, but do not integrate its Core HTTP changes or add automatic self-client retry here.

Known limitation: if a Kibana self-call is the first operation after the account's access token expires, it can fail until the separate renewal work lands. An earlier ES operation may refresh the shared request credential, but consumers cannot rely on that ordering. Shortening token lifetime makes this limitation more frequent.

### 5. Deny renewal and let issued tokens expire

Use option 1, as selected by Larry. Reuse the existing UIAM request lifecycle and binding checks for the ES backend. Do not introduce explicit invalidation, a background revocation task, a durable access-token inventory, or a change to the configured ES token lifetime.

The execution contract is:

1. Before starting an execution, verify its current workload binding and retrieve the account's encrypted credential. A missing or unverifiable binding or credential prevents execution.
2. Before renewing an execution's credential, verify that the workload is still bound to the same account. An observed missing, invalid, or different-account binding permanently disables renewal for that request.
3. On every exchange, ES authenticates the long-lived credential. A disabled/deleted account or deleted credential prevents a successful exchange once ES observes that state. Treat these failures as terminal for that request.
4. Already-issued access tokens remain valid until their own expiry. Unbinding or disabling an account does not synchronously revoke those tokens or cancel work that already authenticated.
5. On execution completion, release the request registry entry and remove its authorization header. Do not call the remote token-invalidation API; existing token copies expire naturally.
6. Keep transient-outage backoff distinct from terminal revocation. Neither failure path may fall back to the initiating user, Kibana's system identity, or the long-lived credential for workload execution.

Elasticsearch's token lifetime defaults to 20 minutes and can be configured up to one hour. Preserve the deployment's existing value. See the [token-service settings](https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings#token-service-settings). The ten-minute Kibana `requestLifetime` setting limits renewal of standalone synthetic requests; it does not shorten the validity of an issued token, and workload executions use binding checks instead of that lease.

Preserve and document the shared helper's existing concurrency semantics:

- Expiry is measured from issuance, not from the administrator's action. An exchange that passed its binding check may complete after an unbind. This plan makes no strict revocation deadline measured from the unbind response and does not add distributed coordination around mints.
- The existing helper compares account IDs, not binding generations. If a workload is unbound and rebound to the same account between checks, the old execution can still renew. If it observes the missing binding, terminal failure remains latched even after rebinding. Changing this shared behavior is outside this adapter's scope; cover the existing behavior in regression tests so it is explicit.
- A rebind to a different account never switches an existing execution's identity. Its next check refuses renewal; a new execution uses the new binding.

These limits follow from reusing the current UIAM lifecycle. This implementation does not promise proactive cancellation, per-operation binding checks, or remote token invalidation.

## Validation plan

### Unit and service tests

Extend `es_service_accounts.test.ts`, `service_accounts_service.test.ts`, and the credential-store tests as needed. Cover exact exchange endpoint/body and internal client, least-privilege identity, all failure classes, redacted errors, runtime gates, ES workload wiring, space selection, and configured request lifetime.

Reuse the existing fake-request tests and add ES integration points for concurrent renewal, backoff, release during exchange, transient credential-store failures, invalid credentials, unbind/rebind, and no retry for unrelated requests. Cover the accepted expiry-based revocation contract, including same-account rebind and in-flight exchanges, without adding remote invalidation.

### Real Elasticsearch coverage

Extend the existing `test/scout_service_accounts/api` suite and its `service_accounts` server config. Security is already enabled in Scout CI discovery. Use a test-only plugin that registers a workload type and invokes the Core contracts; test through scoped requests rather than simulating execution with an administrator client.

Test:

1. Create an account with a restricted role, bind a workload, run an allowed ES action, and deny an action outside that role.
2. Verify the effective identity is the account, not the broker or initiating user.
3. Execute in a non-default space and deny cross-plugin and cross-space access.
4. Expire an ES access token and verify the existing scoped ES client renews successfully. Use a short token lifetime in the isolated test config; account for the registry's ten-second fresh-token reuse window.
5. Reject missing/tampered credentials, disabled/deleted accounts, and a deleted long-lived credential. Verify no fallback identity.
6. Exercise expiry-based revocation: refuse new execution and renewal when the binding/account is invalid; prove an already-issued token can still authenticate until expiry. Cover mint-versus-unbind and same-account rebind behavior in deterministic unit tests.
7. Confirm Serverless/UIAM behavior still passes and the feature remains unavailable when its flag is disabled.

Register cleanup before creating resources. Remove suite-owned bindings, credentials, service accounts, roles, and test data; invalidate test-issued tokens where needed. Never expose credentials from test routes or snapshots.

### Commands during implementation

Use Node `24.21.0` from `.nvmrc`. Run `node scripts/kbn bootstrap` for this unbootstrapped checkout before validation.

```sh
node scripts/jest x-pack/platform/plugins/shared/security/server/service_accounts
node scripts/jest x-pack/platform/plugins/shared/security/server/authentication/authentication_service.test.ts
node scripts/type_check --project x-pack/platform/plugins/shared/security/tsconfig.json
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet service_accounts
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/platform/plugins/shared/security/test/scout_service_accounts/api/playwright.config.ts
node scripts/check.js --scope=local
```

Scope additional checks to any Core contract, saved-object, or test-harness packages actually changed. Start the Scout stack once and reuse it while iterating.

## Delivery boundaries and completion criteria

Deliver the ES exchange adapter, real ES workload bindings, expiry-based revocation behavior, and their unit and live integration tests together. No saved-object migration or new persisted token type is expected: reuse the existing credential and binding objects.

The issue is complete when:

- A bound workload runs under the ES service account's restricted privileges through the existing Core contract.
- An expired access token is re-exchanged transparently for ES calls, using Kibana's internal identity as broker and preserving the workload's identity.
- Missing, tampered, disabled, deleted, or revoked authority fails without fallback; transient failures use bounded retry backoff.
- Revocation follows the documented option-1 semantics, and issued tokens expire naturally.
- Serverless/UIAM behavior remains covered, the release target is 9.6, and the feature remains off by default.
- The scoped checks and real ES integration coverage pass, and the known self-client limitation is documented.

Self-client renewal is deferred to #290877 / #290990. Workflows adoption remains separate in #292599; use its consumer flow as an integration check when available, without claiming reliable self-calls after expiry. Immediate/background invalidation, shorter production token lifetimes, binding-generation semantics, account-management UI, role downscoping, and general auditing are outside this issue's agreed scope.

## Implementation-time verification

The product scope is settled. During implementation, verify the generated ES client types, actual response/error shapes, Basic-license behavior, and the state of overlapping binding-store changes. Those checks may change the adapter details, but must not silently expand the agreed scope.

## Implementation results

- Implemented credential exchange and synthetic request creation, renewal, and release in `EsServiceAccounts`, using the existing request registry. Client 9.5 request types do not include the new grant, so the adapter uses a transport request with the generated token response type. Per review, it trusts the ES response without runtime validation.
- Enabled shared workload bindings for ES and UIAM. Excluded the Spaces saved-object extension for the internal binding client because the binding store supplies explicit namespaces; the encryption extension remains enabled.
- Classified terminal refusals and transient failures, including ES transport errors and Retry-After backoff. Exchange logs omit credentials and raw upstream errors.
- Added a test-only workload consumer plugin and Scout execution coverage. The 15-second ES token lifetime applies only to the isolated Scout config; production configuration remains unchanged.
- Preserved option-1 revocation, the default-off flag, and the deferred self-client work. No access-token persistence or remote invalidation was added.

### Initial implementation validation

- All 24 service-account Scout API tests passed against Elasticsearch 9.6, including seven new execution tests: restricted privileges, renewal on an existing client, space isolation, unauthorized execution, and renewal refusal after unbind, disable, or credential deletion. Each revocation case also proved the issued token remained valid before expiry.
- Basic-license smoke checks passed with both `kibana_system` and `elastic/kibana` broker identities. Both returned the expected service-account principal, an access token with a 1,200-second expiry, no refresh token, and enforced the restricted role.
- A separate token-service-disabled smoke check returned HTTP 400 with `feature_not_enabled_exception`, which the adapter classifies as terminal.
- Scoped Security and test-plugin type checks, changed-file lint, and whitespace checks passed. Unit coverage includes registry concurrency, retry/backoff, credential integrity failures, unrelated requests, and the accepted binding race behavior.
- The complete Security Jest suite passed with two workers: 268 suites, 3,980 tests, and 531 snapshots (15 existing skips and one existing todo). The first repository-check run had a worker SIGSEGV in the unchanged API-key creation suite; the complete successful rerun included that suite.
- The new test plugin passed `lint_ts_projects`.
- `node scripts/check.js --scope=local` completed: generated-project, lint, Scout Jest (37 suites / 458 tests), and type checks passed. The generated workspace changes caused type checking to cover all 1,514 projects. The command exited nonzero only because of the initial Security Jest worker crash described above; its full-suite retry passed. No tests were removed or skipped to resolve the crash.

### Review follow-up

Removed ES token-response validation and its corresponding validation tests, as requested. The adapter now uses `SecurityGetTokenResponse` and trusts the backend. Inconsistent stored credentials log each mismatched identity field with its expected and actual values; token values remain excluded. Removed the exchange comment and the ES-specific logger scope.

Retry behavior is unchanged. Both adapters retry HTTP 408, 429, 500, 502, 503, and 504 and honor Retry-After. UIAM also recognizes its own terminal application codes and native-fetch socket error codes. ES uses the client's transport-error classes and reads HTTP response headers from `ResponseError`; credential-store Boom errors remain supported.
