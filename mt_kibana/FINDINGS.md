# M1 findings

Shared notes for the week. Copy the final version into the planning doc.

## What worked with the single hook

First end-to-end run on 2026-11-02, with ES 9.7.0 snapshots and the commands in [`README.md`](README.md):

- `smoke.sh` passes for all three projects. Before the hook (no tenants file), only `project-a` passes and `b` and `c` get a 401.
- Security authentication, the console route's `requiredPrivileges` check, and both handlers follow the header with no plugin changes.
- Cluster A's password with header `project-b` gets a 401, header `project-z` gets a 400, and no header goes to `project-a`.
- An API key created on cluster B works with header `project-b` and gets a 401 with header `project-a`.
- 300 parallel console proxy calls (current user) and 300 parallel `/api/stats` calls (internal user), mixed across the three projects, show zero cross-talk.
- Caveat for logging: ES query logs name the tenant (`elasticsearch.query.tenant-project-b`) only when the caller doesn't set its own logger name. Console proxy calls log as `elasticsearch.query.console`.

## Beyond M1: saved objects and encrypted saved objects per project

Run on 2026-11-03 with `so_check.sh`, `eso_check.sh`, and the isolation check in the README:

- Plain saved objects did **not** already follow the project, as the plan assumed. With security on, the security plugin's saved objects client factory and its spaces client use `createInternalRepository()`, which could only reach the home cluster. Passing the request to `createInternalRepository` fixed where data views, spaces, and settings are stored.
- Before the ESO change, connectors created through `project-b` returned 404 when run, because ESO looked them up on cluster A. Now they run, decrypt their secrets, and write only to their own cluster, including 40 parallel runs across `project-b` and `project-c`.
- Each project now has its own encryption key, and the logs show one key hash per project. Cluster B's connector secrets fail to decrypt with A's key.

## What still reaches the home cluster

- **Advanced settings reads:** the value is stored in the right cluster, but reads come from a process-wide cache keyed only by space (`sharedUserProvidedCache` in ui-settings). So one project sees another's values. The cache key needs the project, and `asScopedToClient(savedObjectsClient)` doesn't have it.
- **Event log:** each connector run in `project-b` writes its event log entries to cluster A (42 entries in one `eso_check.sh` run). The writes happen in a buffered timer, outside the request, so the misrouting detector doesn't see them.
- **Misrouting detector call sites** seen during project requests:
  - licensing's license fetcher (one global license)
  - the Agent Builder SML indexer (`SmlIndexerImpl.deleteEntry`)
  - Fleet `getSettings`
  - ESO point-in-time finders created without a request, for example Synthetics params
- **Browser login** for non-home projects fails, because user profile activation runs as the home internal user (M4).
- **Background work:** `apiKeys.validate()` and task manager fake requests carry no project, so they use the home cluster.

## Stretch-goal results

## Open questions for M2 (encrypted saved objects) and M3 (MKI)
