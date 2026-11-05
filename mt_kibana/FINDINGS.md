# M1 findings

Shared notes for the week. Copy the final version into the planning doc.

## What worked with the single hook

First end-to-end run on 2026-11-02, with ES 9.7.0 snapshots and the commands in [`README.md`](README.md):

- `smoke.sh` passes for all three tenants. Before the hook (no tenants file), only `project-a` passes and `b` and `c` get a 401.
- Security authentication, the console route's `requiredPrivileges` check, and both handlers follow the header with no plugin changes.
- Cluster A's password with header `project-b` gets a 401, header `project-z` gets a 400, and no header goes to `project-a`.
- An API key created on cluster B works with header `project-b` and gets a 401 with header `project-a`.
- 300 parallel console proxy calls (current user) and 300 parallel `/api/stats` calls (internal user), mixed across the three tenants, show zero cross-talk.
- Caveat for logging: ES query logs name the tenant (`elasticsearch.query.tenant-project-b`) only when the caller doesn't set its own logger name. Console proxy calls log as `elasticsearch.query.console`.

## Beyond M1: saved objects and encrypted saved objects per tenant

Run on 2026-11-03 with `so_check.sh`, `eso_check.sh`, and the isolation check in the README:

- Plain saved objects did **not** already follow the tenant, as the plan assumed. With security on, the security plugin's saved objects client factory and its spaces client use `createInternalRepository()`, which could only reach the home cluster. Passing the request to `createInternalRepository` fixed where data views, spaces, and settings are stored.
- Before the ESO change, connectors created through `project-b` returned 404 when run, because ESO looked them up on cluster A. Now they run, decrypt their secrets, and write only to their own cluster, including 40 parallel runs across `project-b` and `project-c`.
- Each tenant now has its own encryption key. Cluster B's connector secrets fail to decrypt with A's key.

## PR review follow-ups

Run on 2026-11-04 with all three scripts, the misrouting checks, and the session login check in the README:

- Tenants are their own core service. It reads `tenants.file`, and is the only code that creates a `TenantId`, after checking the tenant exists. The header was renamed to `x-elastic-tenant-id` (changed back in the second review round below). Results match the earlier runs.
- Encrypted saved objects no longer get raw keys. Core hands them a crypto for the request's tenant, and only for requests received over HTTP: a fake request that targets a tenant throws (dropped in the second review round below). A connector created through `project-b` and copied into cluster A fails to decrypt there with `Failed to decrypt attribute "secrets"`, so it uses B's own key.
- Session login works for non-home tenants. User profile activation and profile reads now follow the request, so login through `project-b` returns 200 and syncs the profile in cluster B.

## M4: sessions per tenant

Run on 2026-11-04 with `session_check.sh`, `session_cleanup_check.sh`, the token provider check, and three browser tabs (see the README):

- Before M4, login through `project-b` "worked" only because authentication followed the header: the session itself went to cluster A's session index, and B's cookie sent with header `project-a` returned 200. Now each tenant's sessions are stored in its own cluster's session index, which is created on first use. B's cookie gets a 401 through `project-a`.
- The session cookie records its tenant, and a request for another tenant ignores the cookie before any session index lookup.
- Session contents are encrypted with the tenant's `securityEncryptionKey` from `tenants.yml`, handed to the security plugin as a crypto through core security. Changing only B's key logs B out and leaves A and C logged in. The cookie itself still uses the process-wide `xpack.security.encryptionKey`, because core registers one cookie strategy per process.
- Profile changes (theme, avatar) and profile bulk gets through the security plugin's routes go to the tenant's cluster.
- The SAML, OIDC, PKI, token, and Kerberos providers get, refresh, and invalidate tokens on the tenant's cluster. Only the token provider was run end to end: login, refresh after the access token expired, and logout through `project-b`. The others have unit tests only.
- The session cleanup task also cleans the session indices of the tenants this Kibana instance served since it started.
- In a browser, all three tenants stay logged in side by side on `project-<x>.localhost`, and logging out of one leaves the others logged in.

## Second tenants service review

The low-effort items from [Rudolf's follow-up](https://github.com/elastic/kibana/pull/302955#issuecomment-6655861815):

- The wire header is `x-elastic-project-id` again, the header the Cloud Proxy sets. Internal names stay "tenant". `m3/deploy.sh` now writes `tenants.file` instead of the removed `elasticsearch.multiTenancy.tenantsFile`, and generates a `securityEncryptionKey` per project.
- Only the HTTP onRequest hook reads the header. `asScoped()` and the tenant crypto no longer fall back to it, so a fake request that only copies the incoming headers goes to the home cluster.
- `tenants.resolve(id)` is the one function that turns a stored tenant ID into a `TenantId`, after checking the tenant exists. The header lookup uses it.
- The tenant crypto APIs (`getTenantCrypto`, `getTenantSessionCrypto`, and the tenants service's `getEncryptionCrypto` and `getSessionCrypto`) take a `TenantId` instead of a request. Callers pass `request.tenantId`. The "only for requests received over HTTP" throw is gone.
- `getUnsafeInternalClient({ request })` gives its encryption extension the request's tenant, so objects it encrypts use the tenant's key instead of the home key.
- Every tenant in the tenants file must have both `encryptionKey` and `securityEncryptionKey`.

## Deferred from the second tenants service review

- **Ban `as TenantId` outside `@kbn/core-tenants-server-internal`** with a lint rule, so `tenants.resolve` stays the only place that stamps one. Later, `TenantId` could become an opaque handle the service mints and records in a `WeakSet`. This guarantees a tenant ID is valid, not that a plugin may act for it: that boundary is the per-plugin tenant config slices, also deferred.
- **Fake requests carry the tenant, recorded when work is scheduled**, the same way as `spaceId`:
  - Task manager: store `userScope.tenantId` from `request.tenantId` in `api_key_utils.ts`, and set it on the fake request in `task_runner.ts` (`buildTaskFakeRequest`) after `tenants.resolve()`. Reporting jobs do the same; tenant reports go to the home cluster until then.
  - Create the task's API key on the tenant's cluster, or it only works on home.
  - A tenant deleted before its task runs should fail the task permanently instead of retrying.
  - Add a core helper (or a `tenantId` argument required in multi-tenant mode) for the roughly 30 callers of `kibanaRequestFactory`.
  - Schedule system tasks with fixed IDs (`session_cleanup`, telemetry) from the plugin `initialize` lifecycle ([#297124](https://github.com/elastic/kibana/pull/297124)), once per tenant, with the tenant in the task ID for a shared queue. That replaces the session cleanup fan-out over tenants served since startup.
  - Strict mode: fail (or warn first) on a fake request with no tenant on a multi-tenant node.
  - With the tenant in the task document, task execution works whatever the claiming design. Today task manager's store isn't routed, so tasks scheduled through tenant B already sit in, and are claimed from, the home cluster's task index.
- **Per-tenant key rotation:** `withPrimaryCrypto` drops the decryption-only keys, so a tenant can't rotate its key. This needs per-tenant decryption-only keys in the tenants file, the tenants service, and ESO.
- **Actions client and connector token clients** still use the home ESO client (`createActionsClient`, `createRouteHandlerContext`, `getServicesFactory`), so `getAxiosInstance` and OAuth token reads look for a non-home connector's secrets on the home cluster.

## M5: data views and the data plugin

Run on 2026-11-05 with `data_check.sh`, `so_check.sh`, and `smoke.sh` (clusters on 9220-9222, Kibana on 5611):

- Most of it already worked. Field lists (`_fields_for_wildcard`), a data view's fields, the `es`, `ese`, and ES|QL search strategies, and KQL value suggestions all use request-scoped clients, so they read the tenant's cluster with no changes. 10 of 13 `data_check.sh` checks passed before any change.
- **Default data view:** setting it through `project-b` stored it in cluster B, but `project-b` then read `project-a`'s value. The default data view is the `defaultIndex` advanced setting, and settings reads came from a process-wide cache keyed only by space. Saved objects repositories and clients now know their tenant (`getTenantId()`), and the settings cache key is `<tenant>:<space>`. This also fixes the advanced settings leak that `so_check.sh` found. 300 parallel settings reads across three tenants, each with its own value, show zero cross-talk.
- **KQL opt-in counter:** the data plugin's `/internal/kql_opt_in_stats` route created an internal repository without the request, so every tenant's counter went to cluster A. It now passes the request.
- After both fixes: `data_check.sh` 13/13, `so_check.sh` 13/13, `smoke.sh` 3/3.
- Not checked: search sessions (background search saved in a session saved object). The search usage collector and the data views usage collector use internal repositories without a request, so they only count the home cluster, like the other usage collectors.

## What still reaches the home cluster

- **Project name and other cloud settings:** the project picker showed the same name for every project, because `xpack.cloud.serverless.project_name` is one value per process. As a stopgap, a tenant can set `projectName` in the tenants file, and core swaps it into the cloud plugin's browser config when it renders a page for that tenant. Server-side reads of `cloud.serverless.projectName`, and the other cloud settings (`project_id`, the "Manage project" and "View all projects" URLs), still have one value per process. They belong to the per-tenant config slices.
- **Initial solution view setup:** the spaces plugin's `InitialSolutionSetupService` keeps one `setupComplete` flag for the whole process. Once one tenant picks a solution view, no other tenant is asked, even though its default space has none.
- **User profiles through core's public API:** `core.userProfile` `suggest`, `bulkGet`, and `update` take no request, so they use the home cluster. Callers include Cases, alerting, Agent Builder, and the Spaces plugin, which fails to save "last selected space" for non-home tenants with `document_missing_exception`. The fix is an optional `request` on core's user profile API, then updating each caller.
- **Event log:** each connector run in `project-b` writes its event log entries to cluster A (42 entries in one `eso_check.sh` run). The writes happen in a buffered timer, outside the request, so they don't know its tenant.
- **Misrouting detector call sites** seen during tenant requests, before the detector was removed:
  - licensing's license fetcher (one global license)
  - the Agent Builder SML indexer (`SmlIndexerImpl.deleteEntry`)
  - Fleet `getSettings`
  - ESO point-in-time finders created without a request, for example Synthetics params
- **Background work:** `apiKeys.validate()`, task manager fake requests, and reporting jobs carry no tenant, so they use the home cluster (see the deferred items above).
- **Session cleanup** only knows the tenants this Kibana instance served since it started. After a restart, a tenant's expired sessions stay until a request for it arrives, and one task cleaning every tenant in turn won't scale to thousands of tenants (see task claiming in the planning doc).
- **Session cleanup audit events** are logged without a request, so they don't say which tenant the removed sessions belonged to.

## Stretch-goal results

## Open questions for M2 (encrypted saved objects) and M3 (MKI)
