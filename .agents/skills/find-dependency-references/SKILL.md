---
name: find-dependency-references
description: Find all files that import or require a specific dependency, with team ownership grouping from CODEOWNERS. Use when analyzing dependency usage, planning migrations, or auditing third-party library consumption.
---

# Find Dependency References

## Overview

Finds all files in the codebase that import or use a given dependency (e.g., `lodash`, `moment`, `enzyme`), extracts which APIs are used, and groups results by team ownership.

## Helper script

Run from the repo root:

```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/find-dependency-references/find_dependency_references.ts --dependency <name>
```

Options:
- `--dependency <name>` -- the dependency to search for (e.g., `enzyme`, `lodash`, `moment`)

Output: JSON with:
- `dependencyName` -- the searched dependency
- `totalScannedFiles` -- number of files scanned
- `totalMatchingFiles` -- number of files with imports
- `uniqueApis` -- list of specific APIs used from the dependency
- `matchingFilesByTeam[]` -- files grouped by CODEOWNERS team, each with extracted API usage
- `matchingFiles[]` -- flat list of all matching file paths
- `analysisTimeMs` -- how long the analysis took

### Examples

```bash
node --no-experimental-require-module -r @kbn/setup-node-env \
  .agents/skills/find-dependency-references/find_dependency_references.ts \
  --dependency enzyme
```

## How it works

1. Scans all `.js`, `.jsx`, `.ts`, `.tsx`, `.d.ts` files in the repo (respecting `.gitignore`)
2. Detects ES6 imports (`import ... from 'dep'`), CommonJS requires (`require('dep')`), and dynamic imports (`import('dep')`)
3. Extracts API usage: destructured imports, static method calls, and method calls on assigned variables
4. Cross-references each matching file with `.github/CODEOWNERS` for team grouping (most-specific rule wins)

## Manual alternative

For a quick check without the full analysis, use the Grep tool:

```
Pattern: from ['"]<dep>['"]
Type: ts
Output mode: files_with_matches
```
