# Affected Package Detection

Detects which `@kbn` packages are affected by changes compared to a merge base. Used by CI to filter test configs and locally to scope impact of changes.

## CLI

```bash
yarn list-affected-packages [options]
```

| Flag             | Env var fallback         | Default        |
| ---------------- | ------------------------ | -------------- |
| `--strategy, -s` | `AFFECTED_STRATEGY`      | `moon`         |
| `--deep, -d`     | `AFFECTED_DOWNSTREAM`    | `false`        |
| `--merge-base, -b` | `GITHUB_PR_MERGE_BASE` | `origin/main`  |
| `--json, -j`     | —                        | `false`        |

Precedence: **CLI flag > env var > default**.

## Strategies

**Moon** (default) — runs `moon query projects --affected`. Slower (~2–4 s) but uses Moon's own dependency graph.

**Git** — runs `git diff --name-only` and maps changed files to packages via `package.json` link deps. Faster (~100–300 ms), optionally traverses downstream deps from `moon.yml` / `tsconfig.json`.

## Exports

- `getAffectedPackages(mergeBase, configOverride?, log?)` — returns `Set<string>` of affected package IDs.
- `filterFilesByAffectedPackages(files, affectedPackages)` — filters file paths to those in the given set; pass `null` to skip filtering.
- `getAffectedPackagesGit` / `getAffectedPackagesMoon` — low-level strategy functions.
- `getPackageLookup` / `findPackageForPath` — package directory ↔ ID mapping utilities.
