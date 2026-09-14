# Service account integration validation — September 14, 2026

This integration updates PR #287117 to exercise the current implementation of
[#286850](https://github.com/elastic/kibana/pull/286850). It is still a stacked PoC,
not the complete service account product.

## Dependency revisions

- Token infrastructure: #286850, `5af9bafd027fcfcc97ad1c3e26e8c7b0bc1dd58a`.
- Workload bindings: #286875, `777e5b9a1af2592412f12f0628444f2be439ea82`, adapted
  to the current token error classification, request lifetime, and project context.
- Account get/list routes: commit `e66e857d8bf2` from #286889. The example plugin is
  not required for Workflows and is not included.
- Original Workflows integration: the four commits ending at `5a1db0789321`.

The binding layer retains its mint interceptor, binding recheck, and request release
bracket. Its explicit lifetime override belongs to #286875. Token exchange, retry
classification, and internal request authentication come from #286850.

## Observed live results

- Browser bind/save/run: passed; Elasticsearch returned the seeded proof document.
- Execution identity UI: passed; service account name and ID were displayed.
- Rebinding: passed; the next run used the replacement service account.
- Scheduled execution: passed; Elasticsearch returned the seeded proof document.
- ES-first expiry and loopback: passed using a one-minute UIAM ephemeral token and two
  40-second HTTP calls. Elasticsearch authenticated the same SA before and after
  expiry; a subsequent Kibana `/internal/security/me` call returned the same SA.
- Kibana-first after expiry: failed with HTTP 401 (`0x7E0116`). The same workflow
  succeeds when ES runs first and refreshes the token. Workflows' Kibana step copies
  the current authorization header into `fetch`; it does not invoke the ES client's
  refresh hook. The receiving HTTP request is not the registered fake request.
  This is an integration gap beyond #286850's stated ES-client-401 refresh scope.
  The expiry suite retains a failing assertion for this scenario, alongside the
  passing ES-first case; do not treat the suite as green.
- Saved Slack Stack connector after expiry: passed against a local mock webhook.
  After two 40-second HTTP calls, the connector sent the expected body using its
  stored webhook URL. No SA Authorization header was sent to the webhook, and the
  following Kibana identity call authenticated as the bound SA. This exercises the
  in-process, request-scoped Actions client path, which uses dynamic privilege checks.
  Other connector types have not been established by this probe. The Index connector
  was attempted but is not a supported workflow step in this revision; validation
  rejected it before execution.
- Agent Builder execution: passed, but the triggering user's conversation lookup
  still returned 404.
- Editor execution: passed; denied editor YAML rebinding still returned 500 rather
  than 403.
- Resume: the probe completed, but the post-resume ES identity was the Task Manager
  API key rather than the bound SA. This remains a Workflows integration gap.

The last three probes record known gaps; their passing test status is not a claim
that all observed behavior is correct. They must remain separate from the token PR's
approval decision.

The reviewed source paths are Security's
`server/authentication/authentication_service.ts` (fake-request reauthentication)
and Workflows' `server/step/kibana_action_step.ts` (`getAuthHeaders` / `makeHttpRequest`).
The latter copies the bearer token into an outbound HTTP call without refreshing it.

## Review implication

The tested ES refresh behavior supports #286850's stated contract. It does not
establish transparent refresh for outbound Kibana HTTP calls. Before describing
Workflows as fully integrated, its outbound-call path needs a supported credential
refresh mechanism that retains binding checks. Do not work around this by inserting
an unrelated ES step into user workflows.

## Repository checks

- Final scoped Workflows type check passed; the repository checker also passed all
  four affected TypeScript projects.
- ESLint found no errors. Project-reference and regenerated Moon metadata checks passed.
- Workflows engine: 2,122 Jest tests passed. ES test tooling: 133 passed.
- Security: 3,719 tests passed in the broad run, but an unchanged role-test worker
  crashed with SIGSEGV. A serial rerun of that suite and the corrected Security
  plugin suite passed all 14 tests and 11 snapshots.
- Focused Workflows CRUD/restore coverage passed 96 tests; scheduled execution
  coverage passed 16 tests.
- The full repository-check invocation was not clean: it recorded the subsequently
  fixed generated metadata and the worker crash, and did not finish the whole
  Workflows management suite. The affected focused checks passed independently.
- Direct-request live expiry suite: one pass (ES first), one failure (Kibana first). This failure
  remains unresolved and is intentionally visible in the draft integration.

- Saved-connector expiry probe: one pass; its lint and scoped type checks passed.

## Reproduction

Use the pinned Node version (`nvm use`) and bootstrap this worktree. Stop any prior
Scout stack using ports 5620/9220 before starting this one.

```sh
UIAM_EPHEMERAL_TOKEN_TTL=PT1M node scripts/scout start-server \
  --arch serverless --domain security_complete --serverConfigSet uiam_local
```

The stack uses the verified UIAM, Cosmos emulator, and Elasticsearch Serverless
images. The ephemeral lifetime override is optional and affects only local UIAM.
For the normal five-minute lifetime, omit it from both server and test commands.
The expiry probe then uses eight 40-second calls instead of two.

```sh
UIAM_EPHEMERAL_TOKEN_TTL=PT1M node scripts/playwright test \
  --config=src/platform/plugins/shared/workflows_management/test/scout_uiam_local/token_refresh/api/playwright.config.ts \
  --project=local

node scripts/playwright test \
  service_account_rebinding.spec.ts service_account_scheduled_execution.spec.ts \
  --config=src/platform/plugins/shared/workflows_management/test/scout_uiam_local/api/playwright.config.ts \
  --project=local

node scripts/playwright test \
  --config=src/platform/plugins/shared/workflows_management/test/scout_uiam_local/ui/playwright.config.ts \
  --project=local
```

Browser tests normally clean up their workflows, proof indices, and accounts. Set
`SA_KEEP_VALIDATION_DATA=true` to retain them for manual inspection; delete those
resources when finished. This option does not affect normal CI runs.
