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

## What still reaches the home cluster

## Stretch-goal results

## Open questions for M2 (encrypted saved objects) and M3 (MKI)
