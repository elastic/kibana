# Data Views API Tests - Scout Migration

This directory contains Scout API tests migrated from FTR tests located in `src/platform/test/api_integration/apis/data_views/`.

## Status

✅ **All test files migrated and implemented!** (2 config files + 38 test files)

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
│   ├── data_views_crud_create_spaces.spec.ts      # ✅ Created - Namespaces/spaces tests
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

## All 38 Test Files Created ✅

### Configuration & Fixtures (2 files)
1. **playwright.config.ts** - Playwright configuration
2. **fixtures/constants.ts** - Common headers and archive paths

### Test Files (38 files)

All test files are fully implemented with proper Scout structure and best practices.

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

**Data Views CRUD (10 files):**
- `data_views_crud_create_validation.spec.ts`
- `data_views_crud_create_main.spec.ts`
- `data_views_crud_create_spaces.spec.ts` - Tests for namespaces/spaces functionality
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

### Best Practices Applied

- **Cleanup in hooks**: All tests use `afterEach` hooks to clean up created resources
- **Response body validation**: Tests verify response structure, not just status codes
- **Deployment agnostic**: All tests use `tags.DEPLOYMENT_AGNOSTIC` tag
- **API credentials**: Tests use `requestAuth.getApiKey()` for authentication

### Admin Role Usage

These tests use the `admin` role because they require:
- Creating/deleting data views across spaces
- Managing Kibana spaces
- Full index pattern management privileges

For tests that only need to read data views, consider using a `viewer` or `editor` role.

## Tags

All tests use `tags.DEPLOYMENT_AGNOSTIC` since these are platform-level API tests that should run on:
- ESS (Stateful)
- Serverless (all project types)

## Reference Documentation

- Scout README: `src/platform/packages/shared/kbn-scout/README.md`
- Scout Best Practices: `src/platform/packages/private/kbn-scout-info/llms/scout-best-practices.md`
- Original FTR tests: `src/platform/test/api_integration/apis/data_views/`
