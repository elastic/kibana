## Service Accounts Example

A tiny plugin that **owns a workload**, the way alerting (or any other consumer) should. It is not a request/response console around Core methods.

Keep the app titled **Service Accounts**. Open it from **Developer examples** — it is hidden from the main nav.

### What it demonstrates

| UI action | What it actually calls |
| --- | --- |
| Create service account (Accounts tab, or Attach → Create and attach) | **Core browser** `core.security.serviceAccounts.create({ name })`. Kibana supplies `role_assignments` and `assumable_by`; callers do not. |
| Refresh / pick from the Accounts directory | **Security plugin HTTP** `GET /internal/security/service_account` (UIAM `GET /uiam/api/v1/service-accounts` as this Kibana, via mTLS / shared secret). This is **not** on Core. Core stays `create` / `isEnabled` / `canCreate` only. |
| Look up by id (Accounts tab) | **Security plugin HTTP** `GET /internal/security/service_account/{id}` (UIAM `GET /uiam/api/v1/service-accounts/{id}` as this Kibana). Use this when listing is 501/404. |
| Create an example job | This plugin's saved object `sa_example_job` (space-scoped). The job id **is** the `workloadId`. |
| Attach / Detach | **Core** operation handle `attach` / `detach` with `workloadType: 'job'` and `workloadId: job.id`. Still requires Elasticsearch `manage_security`. |
| Job list / detail binding | **Core** `getBinding` merged on read. The job document does **not** store `serviceAccountId`. Click the bound id to GET `/internal/security/service_account/{id}` and see the same account card as the Accounts tab. |
| Run as service account | **Core** `withScopedRequest` (ES `_security/_authenticate` + `getCurrentUser`). Tokens never reach the browser. `lastRun` is persisted on the job. |
| Inspector → Create via server Core API | **Core server** `core.security.serviceAccounts.create({ name })` |

If the directory GET returns 404 or 501, the Accounts panel still lets you **look up by id**. Paste-id in the attach flyout still works.

### How to run

Service accounts are currently serverless-only (`xpack.security.serviceAccounts.enabled`). Start Kibana with examples enabled against a serverless project that has UIAM configured:

```
yarn start --run-examples --serverless=es
```

(or whichever serverless flavor matches your project)

Open **Developer examples → Service Accounts**. The acting user needs the Elasticsearch `manage_security` cluster privilege for create / attach / detach.

### Suggested walkthrough

1. Open **Example jobs**, create a job, and open it. It should show **Unbound**.
2. **Attach**: create-and-attach, pick from the directory, or paste an id.
3. **Run as service account**. Compare the identity cards: **You** (this session) and **Scoped request**.
4. Open the collapsed **API inspector** for environment status (`isEnabled`, `canCreate`, operation type `sa_example`, current space), the Core call log, and raw JSON.
5. Detach or delete the job when you are done. Delete also detaches.

### Copy this, not the inspector

A real plugin:

1. `registerOperation({ type })` at setup
2. Persist its own workload (a saved object, a rule, a workflow)
3. `attach` once, using that object's id as `workloadId`
4. `getBinding` when it needs to know who the workload runs as
5. `withScopedRequest` to execute — never mint or store tokens itself

Do not add `list` / `get` / `delete` to Core. The directory in this example is a security-plugin internal HTTP route for debugging.
