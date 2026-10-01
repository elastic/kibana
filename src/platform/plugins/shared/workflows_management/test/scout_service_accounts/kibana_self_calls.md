# Service-account Kibana self-calls

`api/tests/service_account_kibana_request.spec.ts` exercises real `kibana.request`
steps in saved workflows bound to a service account. It temporarily enables
`workflows.kibanaRequest.coreSelfClientEnabled` through Scout's Core settings API
and removes that override after the suite. No extra server configuration is needed
beyond the existing `service_accounts` config set.

The suite checks:

- `/internal/security/me` returns the bound service account, while execution
  attribution still identifies the initiating user.
- A viewer service account receives HTTP 403 from `/api/security/role`, even when
  an admin starts the workflow.
- On stateful Elasticsearch, the same execution survives the real 15-second token
  lifetime: an HTTP step holds the execution open for 16 seconds, then a Kibana
  self-call succeeds and the privileged role query remains forbidden. There is no
  Elasticsearch step after the delay that could renew the token first.

Run one stack at a time:

```sh
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet service_accounts
```

In another terminal:

```sh
node scripts/playwright test service_account_kibana_request.spec.ts \
  --config=src/platform/plugins/shared/workflows_management/test/scout_service_accounts/api/playwright.config.ts \
  --project=local --workers=1
```

For local Serverless/UIAM, stop the stateful stack and start:

```sh
node scripts/scout start-server --arch serverless --domain search --serverConfigSet service_accounts
```

Run the same Playwright command. The identity and authorization tests run on both
backends. The expiry test is stateful-only because the local Elasticsearch token
setting does not control UIAM token lifetime.

## Validation scope

These are local integration tests, not hosted ECH or Serverless QA evidence.
Passing them does not establish UIAM expiry recovery, OAuth-tagged route coverage,
or multi-instance load-balancer behavior. Use an updated deployed image and verify
the self-client flag when validating those paths in QA.

## Local results on 2026-10-01

Validated on main revision `6c6eac9745df`, containing Security PR #293043 and
Workflows self-client PR #283905:

| Scenario | Self-client flag | Result |
| --- | --- | --- |
| Stateful identity, denied role query, real token expiry | On | All three passed |
| Serverless/UIAM identity and denied role query | On | Both passed |
| Serverless/UIAM fresh-token identity control | Off | Passed |
| Stateful expired-token self-call control | Off | HTTP 401, token expired |

The original fresh-token identity failure did not reproduce locally on current
main. The expiry control confirms that the regression detects missing self-client
renewal: the same post-expiry call succeeds with the flag enabled. No production
authentication changes were needed for these passing cases.
