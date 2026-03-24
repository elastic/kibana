---
name: optimize-bundle-size
description: Reduce plugin `page load bundle size` and avoid unnecessary increases in `packages/kbn-optimizer/limits.yml`. Use when proactively optimizing bundles, investigating CI page-load overages, or reviewing PRs that change bundle limits.
disable-model-invocation: true
---

# Optimize Bundle Size

Use this workflow to keep limits stable by moving non-critical code out of the entry bundle.

## 1) Set a baseline

1. Reference `docs/extend/ci-metrics.md` for metric definitions and limits workflow details.
2. Build dist metrics for the target plugin and record current `page load bundle size`.

```bash
node scripts/build_kibana_platform_plugins --focus <pluginId> --dist --workers 4
cat <pluginDir>/target/public/metrics.json
```

3. If this is a regression investigation, compare plugin limits on branch vs upstream.

```bash
git show upstream/main:packages/kbn-optimizer/limits.yml | rg '^\\s{2}<pluginId>:'
rg '^\\s{2}<pluginId>:' packages/kbn-optimizer/limits.yml
```

## 2) Identify entry-chunk drivers

1. Generate a profile build.

```bash
node scripts/build_kibana_platform_plugins --focus <pluginId> --dist --profile --no-cache --workers 4
```

2. Find the entry chunk id and top modules in that chunk.

```bash
entry_id=$(jq -r '.chunks[] | select((.names|index("<pluginId>")) != null) | .id' <pluginDir>/target/public/stats.json)
jq -r --argjson cid "$entry_id" '.modules[] | select((.chunks|index($cid)) != null) | [.size, (.name // .identifier)] | @tsv' <pluginDir>/target/public/stats.json | sort -nr | head -40
```

3. Compare with upstream when the delta is unclear.

```bash
jq -r .modules[].id <pluginDir>/target/public/stats.json | sort - > moduleids.txt
# generate moduleids.txt on both branches and diff them
```

4. Focus on modules imported by the plugin `public` entry/start contract.

## 3) Apply high-impact fixes

1. Replace eager imports in the plugin start contract with lazy boundaries for optional UI.
2. Avoid importing broad barrel files (`index.ts`) from entry paths; import only required modules directly.
3. Split heavy UI into a separate file and load it with `React.lazy(() => import(...))`.
4. Keep `page load bundle size` low; allow `async chunks size` to grow when code is not needed at initial load.

## 4) Re-measure and decide limits

1. Rebuild dist metrics and compare before/after.
2. Keep or restore the old limit if the new value is below it.
3. Raise limits only if no meaningful split is possible, then document why.
4. If a limit increase is required, use `--update-limits` (sets current size +15kb) and include findings in PR notes.

```bash
node scripts/build_kibana_platform_plugins --focus <pluginId> --update-limits
```

## 5) Validate changes

1. Run targeted lint/type checks for touched files.
2. Run `node scripts/check_changes.ts`.
3. Optionally run `--validate-limits` or `--dist --watch` while iterating.
4. If `check_changes.ts` fails due unrelated pre-existing files, call that out explicitly in PR notes.

```bash
node scripts/build_kibana_platform_plugins --validate-limits --focus <pluginId>
node scripts/build_kibana_platform_plugins --dist --watch --focus <pluginId>
```
