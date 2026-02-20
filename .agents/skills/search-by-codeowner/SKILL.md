---
name: search-by-codeowner
description: Search for a term in files owned by a specific GitHub team based on CODEOWNERS. Use when asked to find code within a team's ownership boundary.
---

# Search by Code Owner

## Overview

The `.github/CODEOWNERS` file maps file paths to owning GitHub teams. This skill searches for a term only within directories owned by a given team.

## Helper script

Run from the repo root:

```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/search-by-codeowner/search_by_codeowner.ts --team <team> --search <term>
```

Options:
- `--team <team>` -- GitHub team (e.g., `@elastic/kibana-core`). The `@` prefix is added automatically if missing.
- `--search <term>` -- term to search for (case-insensitive grep)

Output: JSON with `team`, `searchTerm`, `totalScannedFiles`, `totalMatchingFiles`, `matchingFiles[]`, and `analysisTimeMs`.

### Examples

```bash
node --no-experimental-require-module -r @kbn/setup-node-env \
  .agents/skills/search-by-codeowner/search_by_codeowner.ts \
  --team @elastic/kibana-core --search "useEffect"
```

## How it works

1. Parses `.github/CODEOWNERS` to extract directory patterns assigned to the target team
2. Validates each directory exists on disk
3. Runs `grep -ril` within those directories for the search term
4. Returns relative file paths sorted alphabetically

## Manual alternative

If you prefer using the agent's built-in Grep tool directly:

1. Read `.github/CODEOWNERS` and find paths for the target team
2. Use the Grep tool scoped to each directory from step 1
