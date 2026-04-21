# Renovate Reviewer Sync

This tool syncs `renovate.json` `packageRules[*].reviewers` by grepping imports from code and mapping packages to teams defined in `.github/CODEOWNERS`.

## How it Works

The generator uses a multi-stage process optimized for performance and memory efficiency:

1.  **Discovery**: Streams a single `git grep` pass with a combined `import`/`require`/`export ... from` regex to pre-filter candidate files, emitting a live file count while paths arrive so the phase is never silent on large repos.
2.  **Parallel Processing**: Spawns a pool of worker threads (defaults to `max(1, cpus - 1)`) to process files in parallel. Each worker reads files asynchronously with bounded concurrency (`UV_THREADPOOL_SIZE` is bumped if unset).
3.  **Analysis**:
    - **Codeowners**: Each worker compiles `CODEOWNERS` once into a path-segment trie + glob list for fast per-file lookups.
    - **Imports**: Extracts package names from file content with a single combined regex.
4.  **Rule mode**: For each Renovate rule, decide whether it is report-only, managed, or pinned.
5.  **Sync / Report**: Depending on rule mode, either update reviewers, report drift, or do nothing.

## Architecture

```ascii
┌──────────────────────┐
│     Main Thread      │
│    (Orchestrator)    │
└──────────┬───────────┘
           │
           │ 1. Discovery Phase
           │ (git grep "import|require")
           │
           ▼
   ┌────────────────┐
   │ File List Queue│ (~75k files)
   └───────┬────────┘
           │
           │ 2. Task Distribution
           │ (Pull-based Load Balancing)
           │
           ├───► Loop 1 ─────┐
           ├───► Loop 2 ──┐  │
           │     ...      │  │
           └───► Loop N ──┼──┼──► Worker Pool (max(1, cpus - 1) threads)
                          │  │
                          ▼  ▼
                ┌──────────────────────────┐
                │      Worker Thread       │
                ├──────────────────────────┤
                │ [Init] Load CODEOWNERS   │
                ├──────────────────────────┤
                │ For each file:           │
                │ 1. Size Check (< 2MB)    │
                │ 2. Read Content          │
                │ 3. Regex Extract Imports │
                │    (e.g., "lodash")      │
                │ 4. Resolve Team Owner    │
                │    (from CODEOWNERS)     │
                │    (e.g., "@elastic/     │
                │     kibana-core")        │
                └────────────┬─────────────┘
                             │
                             │
                             ▼
            3. Result Stream
            File: src/core/file.ts
            Imports: ["lodash", "react"]
            Teams: ["@elastic/kibana-core"]

                   │
                   ▼
   ┌──────────────────────────────────────┐
   │ Aggregation (Package -> Teams Map)   │
   ├──────────────────────────────────────┤
   │ Example:                             │
   │ "lodash" -> Set([                    │
   │   "@elastic/kibana-core",            │
   │   "@elastic/kibana-app-arch"         │
   │ ])                                   │
   │                                      │
   │ "react" -> Set([                     │
   │   "@elastic/kibana-core"             │
   │ ])                                   │
   │                                      │
   │ Logic: For each file that imports    │
   │ a package, add the file's owning     │
   │ team(s) to that package's team set   │
   └───────┬──────────────────────────────┘
           │
           │ 4. Rule mode evaluation (opt-in per rule)
           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ For each renovate.json packageRules[i]                       │
   ├──────────────────────────────────────────────────────────────┤
   │ Determine mode from x_kbn_reviewer_sync:                     │
   │                                                              │
   │  - missing x_kbn_reviewer_sync      => REPORT-ONLY           │
   │      * compute would-be reviewers                            │
   │      * report drift (if any)                                 │
   │      * never write changes for this rule (even with --write) │
   │      * --check does not fail because of this rule            │
   │                                                              │
   │  - mode: \"sync\"                    => MANAGED              │
   │      * compute reviewers from usage + CODEOWNERS             │
   │      * --write updates reviewers                             │
   │      * --check fails if out of sync                          │
   │                                                              │
   │  - mode: \"fixed\"                   => PINNED               │
   │      * never update reviewers                                │
   │      * do not report drift                                   │
   └──────────────────────────────────────────────────────────────┘
           │
           │ 5. Sync / Report / No-op (depending on mode)
           ▼
    [ renovate.json ]
    packageRules: [
      {
        x_kbn_reviewer_sync: { mode: \"sync\" },
        matchPackageNames: [\"lodash\", ...],
        reviewers: [\"team:kibana-core\", \"team:kibana-app-arch\"]
      },
      ...
    ]
```

## Performance

- **Discovery**: a single streamed `git grep` pass collapses three regex alternatives into one, so the working tree is walked once instead of three times.
- **Concurrency**: pull-based load balancing keeps workers 100% busy; the pool defaults to `max(1, cpus - 1)` so one core stays free for the orchestrator and libuv reactor.
- **CODEOWNERS lookup**: compiled once into a path-segment trie (literal prefixes) + a linear list for glob patterns, replacing per-entry `ignore().add()` construction. Largest single contributor to the speed-up below.
- **I/O**: each worker reads files with `fs.promises.readFile` bounded to 16 concurrent reads, and `UV_THREADPOOL_SIZE` is bumped to match (unless the user has set it explicitly).
- **Memory**: large files (> 2 MB) are skipped. The concurrent-loop pattern keeps only a small bounded set of in-flight file promises per worker.

Full-repo dry-run on Kibana: **~102s → ~10s** (~7x) after the changes above.

## Usage

```bash
# Dry-run (default): prints the would-be changes but writes nothing.
node scripts/sync_renovate_reviewers.js

# Write mode: persists changes to renovate.json for rules with x_kbn_reviewer_sync.mode=sync.
node scripts/sync_renovate_reviewers.js --write

# Check mode: non-zero exit if any managed rule is out of sync; never writes.
node scripts/sync_renovate_reviewers.js --check

# Emit a JSON report alongside any mode:
node scripts/sync_renovate_reviewers.js --report-json ./reviewer-sync-report.json

# Phase timings at verbose level:
node scripts/sync_renovate_reviewers.js --verbose
```

### CLI flags

| Flag | Effect |
| --- | --- |
| `--write` | Write updates back to `renovate.json`. Mutually exclusive with `--check`. |
| `--check` | Exit non-zero if managed rules are out of sync; no write. Mutually exclusive with `--write`. |
| `--report-json PATH` | Write a JSON report to `PATH`. Relative paths are resolved against the current working directory. Passing `--report-json` without a path is an error — it used to silently produce no report. |
| `--verbose`, `-v` | Emit per-phase timings (`⏱ Discovery`, `⏱ Processing`, `⏱ Report generation`, `⏱ Total wall-clock`). |
| `--silent` | Suppress all output, including the live-scan tick. The JSON report (if `--report-json` is passed) is still written. |

Environment:

- `UV_THREADPOOL_SIZE`: size of the libuv thread pool. The tool sets it to `16` when unset so async file reads inside each worker don't serialize through the default 4-slot pool. Explicit user values are preserved.

## Rule modes (opt-in)

Rule mode is the central mechanism for how this tool behaves. It’s stored in a Kibana-specific field on
the rule. Renovate ignores unknown keys, so this is safe to keep in `renovate.json`.

### Default (no field): report-only

If `x_kbn_reviewer_sync` is missing, the tool will compute would-be reviewers and **report drift**,
but it will **never write changes** for that rule (even when running with `--write`). In addition,
`--check` does **not** fail because of report-only rules.

This makes the rollout safe: after merging the tool, nothing changes until teams opt rules in.

### `mode: "sync"` (managed)

Add `x_kbn_reviewer_sync.mode: "sync"` when you want the tool to manage reviewers for a rule.

- `--write` updates `reviewers` for that rule
- `--check` fails CI if the rule is out of sync

### `mode: "fixed"` (pinned maintainer)

Use `mode: "fixed"` for maintainer-owned rules (e.g. toolchain/CI rules like `webpack`):

- The tool will **not update** reviewers
- The tool will **not report drift** for the rule

Example:

```json
{
  "groupName": "webpack",
  "x_kbn_reviewer_sync": {
    "mode": "fixed",
    "reason": "Maintained by Operations; avoid expanding reviewers to all consumers"
  },
  "matchDepNames": [
    "webpack",
    "webpack-cli",
    "webpack-dev-server"
  ],
  "reviewers": [
    "team:kibana-operations"
  ]
}
```
