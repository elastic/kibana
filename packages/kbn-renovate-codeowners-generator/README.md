# Renovate Codeowners Generator

This tool automatically regenerates `renovate.json` `packageRules` by grepping imports from code and mapping packages to teams defined in `.github/CODEOWNERS`.

## How it Works

The generator uses a multi-stage process optimized for performance and memory efficiency:

1.  **Discovery**: Uses `git grep` to instantly find files containing `import`, `require`, or `export ... from`.
2.  **Parallel Processing**: Spawns a pool of worker threads (max 6) to process files in parallel.
3.  **Analysis**:
    - **Codeowners**: Each worker parses `CODEOWNERS` once and matches file paths to teams.
    - **Imports**: Extracts package names from file content using regex.
4.  **Generation**: Aggregates usage data and groups packages by their owning teams into `renovate.json`.

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
           │ 4. Generation
           │ (Group packages by team sets)
           │
           ▼
    [ renovate.json ]
    packageRules: [
      {
        matchPackageNames: ["lodash", ...],
        reviewers: ["team:kibana-core",
                    "team:kibana-app-arch"]
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
node scripts/generate_renovate_codeowners.js
```
