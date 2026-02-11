# Data Views API Tests - Scout Migration

This directory contains Scout API tests migrated from FTR tests located in `src/platform/test/api_integration/apis/data_views/`.

## Status

🚧 **Partial migration** (1 config file + 7 test files)

## Structure

```
src/platform/plugins/shared/data_views/test/scout/api/
├── playwright.config.ts          # Playwright configuration
├── fixtures/
│   └── constants.ts               # Shared constants and test data paths
├── tests/
│   ├── data_views_crud_create_main.spec.ts              # ✅ New data view API - create main
│   ├── data_views_crud_create_spaces.spec.ts            # ✅ New data view API - namespaces/spaces
│   ├── data_views_crud_create_validation.spec.ts        # ✅ New data view API - create validation
│   ├── data_views_crud_delete_errors.spec.ts            # ✅ New data view API - delete errors
│   ├── index_patterns_crud_create_main.spec.ts          # ✅ Legacy index pattern API - create main
│   ├── index_patterns_crud_create_validation.spec.ts    # ✅ Legacy index pattern API - create validation
│   └── index_patterns_crud_delete_errors.spec.ts        # ✅ Legacy index pattern API - delete errors
├── README.md                     # Current file
└── tsconfig.json                 # TypeScript configuration
```

## Test Files (7 files)

**New Data View API (`api/data_views/data_view`) — 4 files:**
- `data_views_crud_create_main.spec.ts` - Main creation tests
- `data_views_crud_create_spaces.spec.ts` - Namespaces/spaces functionality
- `data_views_crud_create_validation.spec.ts` - Request validation errors
- `data_views_crud_delete_errors.spec.ts` - Delete error cases

**Legacy Index Pattern API (`api/index_patterns/index_pattern`) — 3 files:**
- `index_patterns_crud_create_main.spec.ts` - Main creation tests
- `index_patterns_crud_create_validation.spec.ts` - Request validation errors
- `index_patterns_crud_delete_errors.spec.ts` - Delete error cases

> **Note:** Spaces/namespaces tests are only for the new data view API — the legacy index pattern API does not support namespaces.

## Running Tests

```bash
node scripts/scout.js run-tests --stateful --config src/platform/plugins/shared/data_views/test/scout/api/playwright.config.ts
```

## Migration Notes

### Intentionally Not Migrated

The following FTR tests were **intentionally not migrated** because they test deprecated features not supported in Serverless:

- `scripted_fields_crud/` - Scripted fields are deprecated
- `deprecations/scripted_fields.ts` - Tests scripted fields deprecation warnings
- `es_errors/errors.js` - Unit tests for error utilities (not API endpoint tests)

### Admin Role Usage

These tests use the `admin` role because they require:
- Creating/deleting data views across spaces
- Managing Kibana spaces
- Full index pattern management privileges

## Pending Migration

The following FTR test files still need to be migrated to Scout:

**Data Views CRUD (6 files):**
- `data_views_crud/delete_data_view/main.ts` → `data_views_crud_delete_main.spec.ts`
- `data_views_crud/get_data_view/errors.ts` → `data_views_crud_get_errors.spec.ts`
- `data_views_crud/get_data_view/main.ts` → `data_views_crud_get_main.spec.ts`
- `data_views_crud/get_data_views/main.ts` → `data_views_crud_get_all.spec.ts`
- `data_views_crud/update_data_view/errors.ts` → `data_views_crud_update_errors.spec.ts`
- `data_views_crud/update_data_view/main.ts` → `data_views_crud_update_main.spec.ts`

**Existing Indices Route (2 files):**
- `existing_indices_route/params.ts` → `existing_indices_route_params.spec.ts`
- `existing_indices_route/response.ts` → `existing_indices_route_response.spec.ts`

**Fields for Wildcard Route (4 files):**
- `fields_for_wildcard_route/params.ts` → `fields_for_wildcard_route_params.spec.ts`
- `fields_for_wildcard_route/response.ts` → `fields_for_wildcard_route_response.spec.ts`
- `fields_for_wildcard_route/conflicts.ts` → `fields_for_wildcard_route_conflicts.spec.ts`
- `fields_for_wildcard_route/filter.ts` → `fields_for_wildcard_route_filter.spec.ts`

**Fields Route (4 files):**
- `fields_route/cache.ts` → `fields_route_cache.spec.ts`
- `fields_route/conflicts.ts` → `fields_route_conflicts.spec.ts`
- `fields_route/params.ts` → `fields_route_params.spec.ts`
- `fields_route/response.ts` → `fields_route_response.spec.ts`

**Fields API (2 files):**
- `fields_api/update_fields/errors.ts` → `fields_api_update_errors.spec.ts`
- `fields_api/update_fields/main.ts` → `fields_api_update_main.spec.ts`

**Runtime Fields CRUD (10 files):**
- `runtime_fields_crud/create_runtime_field/main.ts` → `runtime_fields_create_main.spec.ts`
- `runtime_fields_crud/create_runtime_field/errors.ts` → `runtime_fields_create_errors.spec.ts`
- `runtime_fields_crud/get_runtime_field/errors.ts` → `runtime_fields_get_errors.spec.ts`
- `runtime_fields_crud/get_runtime_field/main.ts` → `runtime_fields_get_main.spec.ts`
- `runtime_fields_crud/delete_runtime_field/errors.ts` → `runtime_fields_delete_errors.spec.ts`
- `runtime_fields_crud/delete_runtime_field/main.ts` → `runtime_fields_delete_main.spec.ts`
- `runtime_fields_crud/put_runtime_field/errors.ts` → `runtime_fields_put_errors.spec.ts`
- `runtime_fields_crud/put_runtime_field/main.ts` → `runtime_fields_put_main.spec.ts`
- `runtime_fields_crud/update_runtime_field/errors.ts` → `runtime_fields_update_errors.spec.ts`
- `runtime_fields_crud/update_runtime_field/main.ts` → `runtime_fields_update_main.spec.ts`

**Other (6 files):**
- `has_user_index_pattern/has_user_index_pattern.ts` → `has_user_index_pattern.spec.ts`
- `default_index_pattern/default_index_pattern.ts` → `default_index_pattern.spec.ts`
- `swap_references/errors.ts` → `swap_references_errors.spec.ts`
- `swap_references/main.ts` → `swap_references_main.spec.ts`
- `integration/integration.ts` → `integration.spec.ts`
- `resolve_index/resolve_index.ts` → `resolve_index.spec.ts`

## Tags

All tests use `tags.DEPLOYMENT_AGNOSTIC` since these are platform-level API tests that should run on:
- ESS (Stateful)
- Serverless (all project types)

