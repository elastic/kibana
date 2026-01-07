# Renovate Reviewer Sync

This tool syncs `renovate.json` `packageRules[*].reviewers` by grepping imports from code and mapping packages to teams defined in `.github/CODEOWNERS`.

## How it Works

The generator uses a multi-stage process optimized for performance and memory efficiency:

1.  **Discovery**: Uses `git grep` to instantly find files containing `import`, `require`, or `export ... from`.
2.  **Parallel Processing**: Spawns a pool of worker threads (max 6) to process files in parallel.
3.  **Analysis**:
    - **Codeowners**: Each worker parses `CODEOWNERS` once and matches file paths to teams.
    - **Imports**: Extracts package names from file content using regex.
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
           └───► Loop N ──┼──┼──► Worker Pool (Max 6 Threads)
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

- **Discovery**: `git grep` avoids scanning 100k+ files in Node.js.
- **Concurrency**: Pull-based load balancing keeps workers 100% busy without memory spikes.
- **Memory**: Workers are capped at 6 to prevent OOM/Swapping on standard machines. Large files (>2MB) are skipped.

## Usage

```bash
node scripts/sync_renovate_reviewers.js
```

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
