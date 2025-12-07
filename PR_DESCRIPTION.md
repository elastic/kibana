## Summary

Fixes a runtime error on Kibana Serverless where the `@kbn/workflows` module fails to load due to a missing file.

## Problem

Files with `.test.` in their filename are excluded from production builds by the `excludeFileByTags` function in `build_packages_task.ts`. The Elasticsearch `query_rules.test` API endpoint was being excluded because its generated filename (`elasticsearch.query_rules.test.gen.ts`) contained `.test.`, which triggered the build exclusion rule.

This caused the following runtime error on Serverless:

```
Error: Cannot find module './elasticsearch.query_rules.test.gen'
Require stack:
- /usr/share/kibana/node_modules/@kbn/workflows/spec/elasticsearch/generated/index.js
```

## Solution

Updated the ES connector generator to use underscores instead of dots in filenames while keeping the runtime `type` field unchanged for compatibility.

| Before | After |
|--------|-------|
| `elasticsearch.query_rules.test.gen.ts` | `elasticsearch.query_rules_test.gen.ts` |
| ❌ Excluded by build | ✅ Included in build |

The `type` field inside each contract (e.g., `'elasticsearch.query_rules.test'`) remains unchanged, so all runtime lookups continue to work correctly.

## Testing

- [x] Built Kibana locally with `yarn build --skip-os-packages`
- [x] Verified the file exists in the serverless build output
- [x] Verified the `@kbn/workflows` module loads successfully from the built distribution

## Changes

- Modified `generate_es_connectors.ts` to use underscores in generated filenames
- Regenerated all ES connector files with the new naming convention

## Risk

Low - This is a filename-only change. The runtime behavior and API contracts remain identical.


