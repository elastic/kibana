# Data Views API Tests - Scout Migration

This directory contains Scout API test skeletons migrated from FTR tests located in `x-pack/platform/test/serverless/api_integration/test_suites/data_views/`.

## Status

✅ **All 35 skeleton files created!** (2 config files + 33 test files) These are skeleton files with TODO comments. The actual test implementation needs to be completed.

## Structure

```
src/platform/plugins/shared/data_views/test/scout/api/
├── playwright.config.ts          # Playwright configuration
├── fixtures/
│   └── constants.ts               # Shared constants and test data paths
├── tests/
│   ├── es_errors.spec.ts                           # ✅ Created - ES error handling tests
│   ├── existing_indices_route_params.spec.ts      # ✅ Created - Existing indices params validation
│   ├── existing_indices_route_response.spec.ts    # ✅ Created
│   ├── fields_for_wildcard_route_params.spec.ts   # ✅ Created
│   ├── fields_for_wildcard_route_response.spec.ts # ✅ Created
│   ├── fields_for_wildcard_route_conflicts.spec.ts # ✅ Created
│   ├── fields_for_wildcard_route_filter.spec.ts   # ✅ Created
│   ├── data_views_crud_create_validation.spec.ts  # ✅ Created
│   ├── data_views_crud_create_main.spec.ts        # ✅ Created
│   ├── data_views_crud_get_errors.spec.ts         # ✅ Created
│   ├── data_views_crud_get_main.spec.ts           # ✅ Created
│   ├── data_views_crud_get_all.spec.ts            # ✅ Created
│   ├── data_views_crud_delete_main.spec.ts        # ✅ Created
│   ├── data_views_crud_delete_errors.spec.ts      # ✅ Created
│   ├── data_views_crud_update_errors.spec.ts      # ✅ Created
│   ├── data_views_crud_update_main.spec.ts        # ✅ Created
│   ├── fields_api_update_errors.spec.ts           # ✅ Created
│   ├── fields_api_update_main.spec.ts             # ✅ Created
│   ├── runtime_fields_create_main.spec.ts         # ✅ Created
│   ├── runtime_fields_create_errors.spec.ts       # ✅ Created
│   ├── runtime_fields_get_errors.spec.ts          # ✅ Created
│   ├── runtime_fields_get_main.spec.ts            # ✅ Created
│   ├── runtime_fields_delete_errors.spec.ts       # ✅ Created
│   ├── runtime_fields_delete_main.spec.ts         # ✅ Created
│   ├── runtime_fields_put_errors.spec.ts          # ✅ Created
│   ├── runtime_fields_put_main.spec.ts            # ✅ Created
│   ├── runtime_fields_update_main.spec.ts         # ✅ Created
│   ├── runtime_fields_update_errors.spec.ts       # ✅ Created
│   ├── has_user_index_pattern.spec.ts             # ✅ Created
│   ├── default_index_pattern.spec.ts              # ✅ Created
│   ├── swap_references_errors.spec.ts             # ✅ Created
│   ├── swap_references_main.spec.ts               # ✅ Created
│   └── integration.spec.ts                        # ✅ Created
└── README.md                                       # This file
```

## All 35 Files Created ✅

### Configuration & Fixtures (2 files)
1. **playwright.config.ts** - Playwright configuration
2. **fixtures/constants.ts** - Common headers and archive paths

### Test Skeleton Files (33 files)

All test files include proper Scout imports, test structure, fixtures, and numbered TODO comments for implementation.

**ES Errors (1 file):**
- `es_errors.spec.ts`

**Existing Indices Route (2 files):**
- `existing_indices_route_params.spec.ts`
- `existing_indices_route_response.spec.ts`

**Fields for Wildcard Route (4 files):**
- `fields_for_wildcard_route_params.spec.ts`
- `fields_for_wildcard_route_response.spec.ts`
- `fields_for_wildcard_route_conflicts.spec.ts`
- `fields_for_wildcard_route_filter.spec.ts`

**Data Views CRUD (9 files):**
- `data_views_crud_create_validation.spec.ts`
- `data_views_crud_create_main.spec.ts`
- `data_views_crud_get_errors.spec.ts`
- `data_views_crud_get_main.spec.ts`
- `data_views_crud_get_all.spec.ts`
- `data_views_crud_delete_main.spec.ts`
- `data_views_crud_delete_errors.spec.ts`
- `data_views_crud_update_errors.spec.ts`
- `data_views_crud_update_main.spec.ts`

**Fields API (2 files):**
- `fields_api_update_errors.spec.ts`
- `fields_api_update_main.spec.ts`

**Runtime Fields CRUD (10 files):**
- `runtime_fields_create_main.spec.ts`
- `runtime_fields_create_errors.spec.ts`
- `runtime_fields_get_errors.spec.ts`
- `runtime_fields_get_main.spec.ts`
- `runtime_fields_delete_errors.spec.ts`
- `runtime_fields_delete_main.spec.ts`
- `runtime_fields_put_errors.spec.ts`
- `runtime_fields_put_main.spec.ts`
- `runtime_fields_update_main.spec.ts`
- `runtime_fields_update_errors.spec.ts`

**Other (5 files):**
- `has_user_index_pattern.spec.ts`
- `default_index_pattern.spec.ts`
- `swap_references_errors.spec.ts`
- `swap_references_main.spec.ts`
- `integration.spec.ts`

## Next Steps

1. **Implement test logic**: Fill in the TODO comments with actual implementation based on original FTR tests
2. **Add API helpers** (optional): Consider creating a data views API service in `@kbn/scout` for common operations
3. **Run tests**: Use `node scripts/scout.js run-tests --stateful --config src/platform/plugins/shared/data_views/test/scout/api/playwright.config.ts`

## Migration Guidelines

When implementing the TODOs:

- Use `apiTest` instead of `test` for API tests
- Import from `@kbn/scout`: `import { expect, apiTest, tags } from '@kbn/scout'`
- Use fixtures: `{ apiClient, kbnClient, esClient, requestAuth }`
- Set proper headers using `COMMON_HEADERS` and API credentials
- Reference original FTR tests in `x-pack/platform/test/serverless/api_integration/test_suites/data_views/`

## Tags

All tests use `tags.PLATFORM` since these are platform-level API tests that should run on:
- ESS (Stateful)
- Serverless (all project types)

## Reference Documentation

- Scout README: `src/platform/packages/shared/kbn-scout/README.md`
- Migration Guide: `src/platform/packages/private/kbn-scout-info/llms/README.md`
- Original FTR tests: `x-pack/platform/test/serverless/api_integration/test_suites/data_views/`
