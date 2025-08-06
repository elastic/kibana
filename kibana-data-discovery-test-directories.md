# Directories Owned by @elastic/kibana-data-discovery That Contain Tests

**Total: 30 directories with tests**

## Shared Packages (16 directories)

### Data Service & Query Related
- `src/platform/packages/shared/kbn-data-service` (2 test files)
- `src/platform/packages/shared/kbn-es-query` (44 test files)
- `src/platform/packages/shared/kbn-search-response-warnings` (4 test files)

### Data Views & Fields
- `src/platform/packages/shared/kbn-data-view-utils` (3 test files)
- `src/platform/packages/shared/kbn-data-view-validation` (1 test files)
- `src/platform/packages/shared/kbn-field-types` (1 test files)
- `src/platform/packages/shared/kbn-field-utils` (5 test files)

### Discover & Discovery Components
- `src/platform/packages/shared/kbn-discover-contextual-components` (2 test files)
- `src/platform/packages/shared/kbn-discover-utils` (21 test files)

### Unified Components
- `src/platform/packages/shared/kbn-unified-data-table` (12 test files)
- `src/platform/packages/shared/kbn-unified-field-list` (7 test files)
- `src/platform/packages/shared/kbn-unified-histogram` (15 test files)
- `src/platform/packages/shared/kbn-unified-tabs` (4 test files)

### Utility Packages
- `src/platform/packages/shared/kbn-content-management-utils` (1 test files)
- `src/platform/packages/shared/kbn-datemath` (1 test files)
- `src/platform/packages/shared/kbn-resizable-layout` (1 test files)

## Core Plugins (9 directories)

### Data & Search
- `src/platform/plugins/shared/data` (242 test files) - **Largest test suite**
- `src/platform/plugins/shared/field_formats` (26 test files)

### Data Views
- `src/platform/plugins/shared/data_views` (48 test files)
- `src/platform/plugins/shared/data_view_editor` (9 test files)
- `src/platform/plugins/shared/data_view_field_editor` (4 test files)
- `src/platform/plugins/shared/data_view_management` (4 test files)

### Discover
- `src/platform/plugins/shared/discover` (93 test files) - **Second largest test suite**
- `src/platform/plugins/shared/unified_doc_viewer` (5 test files)

### Saved Objects
- `src/platform/plugins/shared/saved_search` (8 test files)
- `src/platform/plugins/shared/saved_objects_finder` (1 test files)

## Context Awareness Profiles (3 directories)
- `src/platform/plugins/shared/discover/public/context_awareness/profile_providers/common/deprecation_logs` (1 test files)
- `src/platform/plugins/shared/discover/public/context_awareness/profile_providers/observability` (15 test files)
- `src/platform/plugins/shared/discover/public/context_awareness/profile_providers/security` (2 test files)

## X-Pack Plugins (2 directories)
- `x-pack/platform/plugins/private/discover_enhanced` (10 test files)

## Key Statistics:
- **Total test files across all directories**: ~588 test files
- **Largest test suites**:
  1. `src/platform/plugins/shared/data` - 242 test files
  2. `src/platform/plugins/shared/discover` - 93 test files
  3. `src/platform/plugins/shared/data_views` - 48 test files
  4. `src/platform/packages/shared/kbn-es-query` - 44 test files

All of these directories are owned by the **@elastic/kibana-data-discovery** team and contain unit, integration, or functional tests.
