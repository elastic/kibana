---
name: codeql
description: Work with CodeQL in Kibana — write, test, and debug custom queries locally, fetch scan results from GitHub, and validate inline suppression comments. Use when writing or debugging CodeQL queries, running CodeQL unit tests, analyzing SARIF results, fetching scan results, or checking codeql suppression justifications.
disable-model-invocation: true
---

# CodeQL

## Project Layout

```
.github/codeql/
├── codeql-config.yml                  # Main config (paths-ignore, packs, query-filters)
├── custom-queries/
│   ├── qlpack.yml                     # QL pack definition (name: kibana-custom-queries)
│   ├── codeql-pack.lock.yml
│   ├── suppression/                   # Alert suppression logic
│   │   ├── AlertSuppression.ql
│   │   └── AlertSuppression.qll
│   └── <category>/                    # e.g. dos/, xss/
│       ├── <RuleName>.ql             # Query file
│       ├── <RuleName>.qhelp          # Help docs (XML)
│       ├── <RuleName>.md             # Human-readable docs
│       ├── <category>-security.qls   # Query suite
│       └── <RuleName>/              # Unit test directory
│           ├── <RuleName>.qlref      # Points to the .ql file (relative to qlpack root)
│           ├── <RuleName>.expected   # Expected test output
│           └── test.js               # Test source code
scripts/codeql/
├── quick_check.sh                     # Local analysis via Docker
└── codeql.dockerfile                  # Docker image (ubuntu + CodeQL CLI)
```

## Running Queries Locally (Full Analysis)

Uses Docker to create a CodeQL database and run queries against real source code.

```bash
# Analyze a source directory with custom queries
bash scripts/codeql/quick_check.sh -s <source_dir> -q .github/codeql/custom-queries

# Analyze with a single query file
bash scripts/codeql/quick_check.sh -s <source_dir> -q .github/codeql/custom-queries/dos/UnboundedArrayInRoute.ql

# Custom results directory
bash scripts/codeql/quick_check.sh -s <source_dir> -r .codeql-results -q .github/codeql/custom-queries
```

**Options:**
- `-s <source_dir>` (required for analysis): directory to scan
- `-q <query_dir|query_file>`: custom queries directory or single `.ql` file
- `-r <results_dir>`: where to store DB and SARIF (default: `.codeql/`)
- `-t`: run unit tests instead of analysis (use with `-q`, no `-s` needed)

**Output:** SARIF file at `<results_dir>/database/results.sarif`. If `jq` is installed, a colored summary prints automatically.

**First run builds a Docker image** (`codeql-env`) from `scripts/codeql/codeql.dockerfile`. On Apple Silicon, it runs with `--platform linux/amd64` (emulation).

## Running CodeQL Unit Tests

Unit tests validate that a query flags the correct lines. Each test lives in a subdirectory named after the query.

### Test structure

```
<category>/<RuleName>/
├── <RuleName>.qlref       # Reference: "category/RuleName.ql"
├── test.js                # Source code with `// $ Alert` annotations
└── <RuleName>.expected    # Expected output (auto-generated or hand-written)
```

- `// $ Alert` on a line means the query **should** flag that line
- Lines without `// $ Alert` should **not** be flagged
- `.expected` file has pipe-delimited format: `| <location> | <message> |`

### Running tests via Docker

Uses the same `codeql-env` Docker image built by `quick_check.sh` (built automatically on first run).

```bash
# Run a specific test directory
bash scripts/codeql/quick_check.sh -t -q .github/codeql/custom-queries/dos/UnboundedArrayInRoute

# Run all tests in the qlpack
bash scripts/codeql/quick_check.sh -t -q .github/codeql/custom-queries
```

### CI workflow

The `codeql-pr.yml` workflow automatically runs unit tests on PR. It finds all `*.qlref` directories and runs `codeql test run` against them.

## Fetching Remote SARIF / Scan Results

The `scripts/fetch_sarif.mjs` script (relative to this skill directory) fetches CodeQL SARIF results and alerts from GitHub for a PR or branch.

```bash
# By PR number
GITHUB_TOKEN=ghp_xxx node .agents/skills/codeql/scripts/fetch_sarif.mjs 252121

# By full ref
GITHUB_TOKEN=ghp_xxx node .agents/skills/codeql/scripts/fetch_sarif.mjs refs/heads/main
```

**Requires:** `GITHUB_TOKEN` env var with `security_events` scope. Depends on `@octokit/rest` (already in Kibana deps).

**What it does:**
1. Lists recent CodeQL analyses for the ref
2. Fetches full SARIF JSON (with rule severity cross-referencing)
3. Prints formatted results (rule, severity, message, file:line)
4. Fetches code scanning alerts for the same ref

## Writing a New Query

1. **Create the `.ql` file** in `.github/codeql/custom-queries/<category>/`:
   - Use `@id js/kibana/<descriptive-id>` (must be unique)
   - Include `@kind problem` (or `path-problem` for taint tracking)
   - Set `@problem.severity` and `@security-severity`
   - Import `javascript` module
   - Refer to existing queries like `UnboundedArrayInRoute.ql` for patterns

2. **Create a unit test directory** `<category>/<RuleName>/`:
   - `<RuleName>.qlref` containing `<category>/<RuleName>.ql`
   - `test.js` with annotated test cases (`// $ Alert` for expected hits)
   - Run tests to generate `.expected` — verify it matches expectations

3. **Add a `.qhelp`** (XML) and/or **`.md`** for documentation

4. **Optionally add a `.qls` query suite** if grouping multiple queries

5. **Test locally** with `quick_check.sh` against real Kibana source code

## Inline Suppressions

Suppressions use the format `// codeql[rule-id] justification text`. Every suppression **must** include a specific justification explaining why it is safe.

**Valid:**
```ts
// codeql[js/path-injection] User input is validated against an allowlist before use
return fs.readFileSync(`/etc/${validatedPath}`, 'utf8');
```

**Invalid — flag these:**
- **Missing justification:** `// codeql[js/path-injection]` with no explanation
- **Generic justification:** `"false positive"`, `"safe"`, `"not a vulnerability"` — says nothing about the actual mitigation
- **Incomplete justification:** `"sanitized"` — does not explain how or by what mechanism

**Good justifications** describe the concrete security mechanism: allowlist validation, DOMPurify escaping, shell-quote library, test-only code, etc.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Docker build fails on ARM | Ensure `--platform linux/amd64` is set (script handles automatically) |
| `qlpack.yml` not found | The script walks up from the `.ql` file to find it — ensure `qlpack.yml` exists at `custom-queries/` root |
| Test produces `.actual` file | Diff `.actual` vs `.expected` — `.actual` files are gitignored |
| Query finds nothing | Check `codeql-config.yml` `paths-ignore` — test/mock dirs are excluded |
| `jq` not found for summary | Install jq: `brew install jq` |

## References

- [Writing CodeQL queries](https://codeql.github.com/docs/writing-codeql-queries/) — official guide covering query structure, QL tutorials, and running queries
