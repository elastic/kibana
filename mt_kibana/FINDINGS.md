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

- Tenants are their own core service. It reads `tenants.file`, and is the only code that creates a `TenantId`, after checking the tenant exists. The header is now `x-elastic-tenant-id`. Results match the earlier runs.
- Encrypted saved objects no longer get raw keys. Core hands them a crypto for the request's tenant, and only for requests received over HTTP: a fake request that targets a tenant throws. A connector created through `project-b` and copied into cluster A fails to decrypt there with `Failed to decrypt attribute "secrets"`, so it uses B's own key.
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

## What still reaches the home cluster

- **Advanced settings reads:** the value is stored in the right cluster, but reads come from a process-wide cache keyed only by space (`sharedUserProvidedCache` in ui-settings). So one tenant sees another's values. The cache key needs the tenant, and `asScopedToClient(savedObjectsClient)` doesn't have it.
- **Initial solution view setup:** the spaces plugin's `InitialSolutionSetupService` keeps one `setupComplete` flag for the whole process. Once one tenant picks a solution view, no other tenant is asked, even though its default space has none.
- **User profiles through core's public API:** `core.userProfile` `suggest`, `bulkGet`, and `update` take no request, so they use the home cluster. Callers include Cases, alerting, Agent Builder, and the Spaces plugin, which fails to save "last selected space" for non-home tenants with `document_missing_exception`. The fix is an optional `request` on core's user profile API, then updating each caller.
- **Event log:** each connector run in `project-b` writes its event log entries to cluster A (42 entries in one `eso_check.sh` run). The writes happen in a buffered timer, outside the request, so they don't know its tenant.
- **Misrouting detector call sites** seen during tenant requests, before the detector was removed:
  - licensing's license fetcher (one global license)
  - the Agent Builder SML indexer (`SmlIndexerImpl.deleteEntry`)
  - Fleet `getSettings`
  - ESO point-in-time finders created without a request, for example Synthetics params
- **Background work:** `apiKeys.validate()` and task manager fake requests carry no tenant, so they use the home cluster.
- **Session cleanup** only knows the tenants this Kibana instance served since it started. After a restart, a tenant's expired sessions stay until a request for it arrives, and one task cleaning every tenant in turn won't scale to thousands of tenants (see task claiming in the planning doc).
- **Session cleanup audit events** are logged without a request, so they don't say which tenant the removed sessions belonged to.

## Stretch-goal results

## Open questions for M2 (encrypted saved objects) and M3 (MKI)
