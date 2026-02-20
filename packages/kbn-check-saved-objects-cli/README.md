# @kbn/check-saved-objects-cli

CLI that validates Saved Object (SO) definitions and mappings against project standards. It compares the current SO type registry to a **baseline snapshot** (from a given Git commit) and runs checks for removed types, new types, and changes to existing types, including migration and rollback validation.

The script is invoked via `node scripts/check_saved_objects.js`. Run `node scripts/check_saved_objects --help` for usage and flags.

---

## How it is used in CI

### Pull request pipeline

The **pull_request** pipeline (`.buildkite/scripts/pipelines/pull_request/pipeline.ts`) adds a "Check changes in Saved Objects" step, which runs `.buildkite/scripts/steps/check_saved_objects.sh`.

On a PR, the step:

1. **Resolves a baseline commit**: It uses the PR merge-base commit (`GITHUB_PR_MERGE_BASE`). Because a snapshot may not exist for that exact SHA, the script walks the commit’s parent chain (up to a limit) until it finds a commit for which a snapshot exists in the cloud bucket (`findExistingSnapshotSha`).
2. **Runs the check**: It calls `node scripts/check_saved_objects --baseline <resolved-sha>` (and `--fix` when auto-commit is enabled). The script fetches the baseline snapshot from the bucket, starts Kibana to build the current type registry, and runs validations comparing current state to that baseline.

### Where snapshots come from

Baseline snapshots are **stored in a GCP bucket** and served at:

`https://storage.googleapis.com/kibana-so-types-snapshots/<git-sha>.json`

They are **produced in the on-merge pipeline** after PRs are merged. In `.buildkite/pipelines/on_merge.yml`, the step "Extract Saved Object migration plugin types" (around lines 702–716) runs `.buildkite/scripts/steps/archive_so_migration_snapshot.sh`, which:

- Builds a snapshot of plugin SO type definitions with `node scripts/snapshot_plugin_types snapshot`
- Uploads it as `<BUILDKITE_COMMIT>.json` to the bucket

So PRs validate against a baseline from a recent merge (or an ancestor with an existing snapshot).

---

## Running the script locally

You can run the check from your Kibana working copy:

```bash
node scripts/check_saved_objects --baseline <gitRev> [--fix]
```

### Parameters and behavior

| Flag | Description |
|------|-------------|
| `--baseline <SHA>` | Commit SHA (or revision) to use as baseline. The script fetches the snapshot for this revision from the cloud bucket and compares the current SO types against it. |
| `--fix` | Generate templates for missing fixture files and update outdated JSON (e.g. `removed_types.json`, SO fixtures). Useful before committing. |
| `--server` | Start Elasticsearch only and keep it running so you can run the check multiple times without restarting ES. |
| `--client` | Do not start Elasticsearch; assume it is already running (e.g. from a previous `--server` run). Use with `--baseline` to run the validation. |
| `--test` | Use a built-in test type registry and hardcoded snapshots instead of starting Kibana or fetching a baseline. No network or ES required. |

You must provide a baseline (e.g. `--baseline <sha>`) unless you use `--server`, `--client`, or `--test`.

### Example: use merge-base as baseline

To mirror CI and validate your branch against the merge-base of your current branch and `main`:

```bash
# Resolve merge-base with main (or your target branch)
MERGE_BASE=$(git merge-base HEAD origin/main)
node scripts/check_saved_objects --baseline "$MERGE_BASE" --fix
```

If that merge-base has no snapshot in the bucket, use an ancestor that does:

```bash
# Example: find the parent of the MERGE_BASE
PARENT_SHA=$(git rev-parse "$MERGE_BASE$"^)
node scripts/check_saved_objects --baseline "$PARENT_SHA" --fix
```

### Example: server + client for repeated runs

To avoid starting Kibana and ES on every run, start ES once in server mode, then run the check multiple times in client mode:

**Terminal 1 – start ES and keep it running:**

```bash
node scripts/check_saved_objects --server
```

Leave this running. It will start Elasticsearch and wait; press Ctrl+C when done.

**Terminal 2 – run the check (one or more times):**

```bash
node scripts/check_saved_objects --baseline <sha> --client
# ... make changes ...
node scripts/check_saved_objects --baseline <sha> --client --fix
```

Each `--client` run starts Kibana, runs the validation against the given baseline, then shuts Kibana down; only ES is reused.

### Fallback to test data (no SO type changes)

When the logic detects that there are **no changes in existing Saved Object types** compared to the baseline, the script will fall back to running with test data (same behavior as passing `--test`). This allows smoke testing the migration logic with dummy SO types.
