# Service-account execution validation

These suites exercise real Workflows bindings and execution credentials. Setup and cleanup use administrator credentials; permission probes use the scoped caller or service account under test.

## Running

Enable the existing service-account server configuration:

```sh
node scripts/scout run-tests --arch stateful --domain classic --config src/platform/plugins/shared/workflows_management/test/scout_service_accounts/api/playwright.config.ts
node scripts/scout run-tests --arch serverless --domain search --config src/platform/plugins/shared/workflows_management/test/scout_service_accounts/api/playwright.config.ts
```

The Serverless configuration uses local UIAM. The suites create disposable accounts, workflows and indices, and remove them during teardown. Permission suites create an explicit role granting only `read` and `view_index_metadata` on their own index; they do not assume that a built-in `viewer` role exists in every project type.

When iterating, start the stack once with `node scripts/scout start-server --arch stateful --domain classic --serverConfigSet service_accounts`, then use `node scripts/playwright test --config src/platform/plugins/shared/workflows_management/test/scout_service_accounts/api/playwright.config.ts --project local`.

## Permission checks

| Scenario | Required evidence |
| --- | --- |
| Saved delegation | A caller with Workflows privileges but no index privileges cannot write directly through an ordinary workflow, yet can execute the administrator's saved SA-bound write. |
| Definition changes | Editors without `manage_security` cannot change steps, remove or replace `run_as`, disable the bound workflow, or change its metadata. Rejected requests leave the saved workflow unchanged. |
| Bulk overwrite | An editor cannot strip `run_as` through bulk import. The saved definition and executable binding remain intact. |
| Unbound draft | Removing `run_as` from a test draft executes with the caller's permissions, not the saved workflow's service account; a forbidden document remains absent. |
| Resume and schedule | Administrator approval and scheduling do not enlarge the read-only account's permissions. |
| Bound child | A read-only child cannot inherit the writer parent's permissions; the parent continues as its own account. |
| Unbound child | An unbound child uses the original limited caller. The parent write succeeds, while the child write is denied without creating a document. |
| Elasticsearch token expiry | Verify the real 15-second token lifetime, authenticate, hold an HTTP step open for 16 seconds, then authenticate/read successfully and deny a write. This keeps the execution running with its scoped request instead of yielding and starting a new one. |

The expiry test is local/stateful only: its HTTP delay server binds an OS-assigned loopback port in the test process, and the service-account config shortens Elasticsearch tokens to 15 seconds. Its read-only account also receives the Actions and Connectors `read` privilege, which permits the HTTP delay step without granting Elasticsearch writes. It does not validate UIAM token lifetime or Kibana self-call recovery.

## CP5 checkpoint

Track cross-environment evidence and outstanding work in [CP5](https://github.com/elastic/security-team/issues/19711). Passing these suites does not establish hosted ECH/Serverless QA, cross-project search, or UIAM expiry coverage. Service-account Kibana self-call authentication and renewal depend on [Security PR #293043](https://github.com/elastic/kibana/pull/293043).
