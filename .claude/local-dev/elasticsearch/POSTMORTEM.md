# Postmortem — `yarn es snapshot` data loss (2026-05-04)

## Summary

While restarting the worktree's Elasticsearch, the assistant ran:

```bash
yarn es snapshot --license trial
```

This command **deletes and re-extracts** `.es/9.5.0/`, including the
`data/` subdirectory. ~848MB of data across 101 indices was destroyed,
including all AESOP / eval state for the skill-eval-platform demo:

| Index / data stream | Lost docs |
|---|---|
| `.aesop-proposed-skills` | 1 (`otel-service-investigation`, full validation result) |
| `.aesop-discovered-patterns` | 5 |
| `.aesop-workflow-executions` | 6 |
| `aesop_metrics` | 1 |
| `kibana-evaluations` (data stream) | 68 evaluator-level results |

No recovery was possible: Trash was empty (`rm -rf` bypasses Finder),
no APFS local snapshots existed on either volume, no Time Machine
destination was configured.

## Root cause

The `yarn es snapshot` script logs `info install directory already
exists, removing` and then re-extracts the snapshot tarball over the
same path. The data directory lives under that same path, so it gets
nuked along with the binaries.

This is the EXPECTED behavior of `yarn es snapshot` in the Kibana
codebase — it's intended for fresh ES installs, not lifecycle
management of a long-running dev cluster.

## Mitigations applied

1. **Dockerized ES with a named volume.** `docker-compose.yml` in this
   directory runs the same `9.5.0-SNAPSHOT` image with a named volume
   (`skill_eval_platform_es_data`) that is independent of any
   filesystem path under the worktree. `git clean`, `yarn` scripts,
   manual `rm -rf` of `.es/`, and worktree resets cannot touch it.

2. **Lifecycle script `dev-es.sh`** with a hard guard that refuses to
   start if a `node scripts/es snapshot` process is already running
   (prevents accidental double-bring-up).

3. **`backup` / `restore` subcommands** in `dev-es.sh` produce
   versioned tarballs of the volume on demand. Recommended cadence:
   before any risky migration, before stopping the demo for the day.

4. **Guard rules** added to `AGENTS.md` and `.cursor/rules/` so that
   any future agent (Cursor, Claude Code, treadmill) is told NEVER to
   run `yarn es snapshot` in this worktree. They are instructed to use
   `dev-es.sh` instead.

## Things to re-check before next demo

- [ ] `dev-es.sh status` shows the AESOP indices populated.
- [ ] Latest backup archive in `backups/` is < 24h old.
- [ ] `kibana.dev.yml`'s `elasticsearch.hosts` (default
      `http://localhost:9200`) points at the dockerized ES.

## Why a worktree-local stack matters

Each worktree must run its own ES + Kibana. We must NEVER reconfigure
the worktree to share another worktree's stack (e.g. `cluster-scout`
on port 9220) — even temporarily — because:

- Plugin/index version drift between branches silently corrupts data.
- A demo state on one worktree can be wiped by tests running on
  another worktree pointing at the same cluster.
- Branch-specific saved objects, encrypted keys, and ESO migrations
  are not portable across branches.

If a worktree's ES is broken, fix it in place (or `dev-es.sh nuke` and
restore from the latest backup). Do not re-point Kibana at a sibling.
