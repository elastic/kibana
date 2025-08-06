# React Testing Library Conversion Candidates for @elastic/kibana-data-discovery

**Total: 72 test files that could be converted to React Testing Library**

These files are currently using Enzyme (shallow/mount) or other testing patterns that would benefit from conversion to React Testing Library for better user-centric testing.

## High Priority - Enzyme Usage (47 files)

### Field Utils Package
- `src/platform/packages/shared/kbn-field-utils/src/components/field_icon/field_icon.test.tsx` (enzyme shallow)

### Resizable Layout Package
- `src/platform/packages/shared/kbn-resizable-layout/src/resizable_layout.test.tsx` (enzyme mount)
- `src/platform/packages/shared/kbn-resizable-layout/src/panels_static.test.tsx` (enzyme mount)
- `src/platform/packages/shared/kbn-resizable-layout/src/panels_resizable.test.tsx` (enzyme mount)

### Unified Data Table Package
- `src/platform/packages/shared/kbn-unified-data-table/src/utils/get_render_cell_value.test.tsx` (enzyme shallow)
- `src/platform/packages/shared/kbn-unified-data-table/src/components/json_code_editor/json_code_editor.test.tsx` (enzyme shallow)
- `src/platform/packages/shared/kbn-unified-data-table/src/components/data_table.test.tsx` (enzyme ReactWrapper)

### Unified Field List Package
- `src/platform/packages/shared/kbn-unified-field-list/src/components/field_list_grouped/no_fields_callout.test.tsx` (enzyme shallow)
- `src/platform/packages/shared/kbn-unified-field-list/src/components/field_list_grouped/field_list_grouped.test.tsx` (enzyme ReactWrapper)
- `src/platform/packages/shared/kbn-unified-field-list/src/components/field_stats/field_stats.test.tsx` (enzyme ReactWrapper)
- `src/platform/packages/shared/kbn-unified-field-list/src/components/field_visualize_button/field_visualize_button.test.tsx` (enzyme ReactWrapper)

### Unified Histogram Package
- `src/platform/packages/shared/kbn-unified-histogram/components/layout/layout.test.tsx` (enzyme ReactWrapper)
- `src/platform/packages/shared/kbn-unified-histogram/components/chart/chart.test.tsx` (enzyme ReactWrapper)

### Data Plugin
- `src/platform/plugins/shared/data/public/search/search_interceptor/timeout_error.test.tsx` (enzyme mount)
- `src/platform/plugins/shared/data/public/search/session/sessions_mgmt/components/status.test.tsx` (enzyme mount)
- `src/platform/plugins/shared/data/public/search/session/sessions_mgmt/lib/get_columns.test.tsx` (enzyme mount)

### Data View Editor Plugin
- `src/platform/plugins/shared/data_view_editor/public/components/loading_indices/loading_indices.test.tsx` (enzyme shallow)
- `src/platform/plugins/shared/data_view_editor/public/components/preview_panel/status_message/status_message.test.tsx` (enzyme shallow)
- `src/platform/plugins/shared/data_view_editor/public/components/preview_panel/indices_list/indices_list.test.tsx` (enzyme shallow)

### Data View Field Editor Plugin (11 files - All using enzyme)
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/format_editor.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/truncate/truncate.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/bytes/bytes.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date/date.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/percent/percent.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date_nanos/date_nanos.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/default/default.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/number/number.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/string/string.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/duration/duration.test.tsx`
- `src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/histogram/histogram.test.tsx`

### Data View Management Plugin (15 files - All using enzyme)
- `src/platform/plugins/shared/data_view_management/public/components/field_editor/components/scripting_help/help_flyout.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/field_editor/components/field_format_editor/field_format_editor.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/field_editor/components/scripting_call_outs/disabled_call_out.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/indexed_fields_table/indexed_fields_table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/indexed_fields_table/components/table/table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/scripted_fields_table/components/confirmation_modal/confirmation_modal.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/scripted_fields_table/components/call_outs/call_outs.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/scripted_fields_table/components/table/table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/scripted_fields_table/scripted_field_table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/source_filters_table/source_filters_table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/source_filters_table/components/confirmation_modal/confirmation_modal.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/source_filters_table/components/table/table.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/source_filters_table/components/add_filter/add_filter.test.tsx`
- `src/platform/plugins/shared/data_view_management/public/components/edit_index_pattern/source_filters_table/components/header/header.test.tsx`

### Discover Plugin
- `src/platform/plugins/shared/discover/public/components/discover_grid_flyout/discover_grid_flyout.test.tsx` (enzyme ReactWrapper)
- `src/platform/plugins/shared/discover/public/components/common/error_callout.test.tsx` (enzyme mount)
- `src/platform/plugins/shared/discover/public/components/common/loading_indicator.test.tsx` (enzyme mount)
- `src/platform/plugins/shared/discover/public/application/context/components/context_error_message/context_error_message.test.tsx` (enzyme ReactWrapper)
- `src/platform/plugins/shared/discover/public/application/doc/components/doc.test.tsx` (enzyme ReactWrapper)
- `src/platform/plugins/shared/discover/public/application/main/components/sidebar/discover_sidebar_responsive.test.tsx` (enzyme ReactWrapper)
- `src/platform/plugins/shared/discover/public/application/main/components/no_results/no_results.test.tsx` (enzyme ReactWrapper)
- `src/platform/plugins/shared/discover/public/application/main/components/layout/discover_resizable_layout.test.tsx` (enzyme mount)
- `src/platform/plugins/shared/discover/public/application/main/components/top_nav/open_search_panel.test.tsx` (enzyme shallow)
- `src/platform/plugins/shared/discover/public/application/main/components/loading_spinner/loading_spinner.test.tsx` (enzyme ReactWrapper)

### Unified Doc Viewer Plugin
- `src/platform/plugins/shared/unified_doc_viewer/public/components/json_code_editor/json_code_editor.test.tsx` (enzyme shallow)

## Medium Priority - Component Testing Patterns (25 files)

These files use component querying patterns that could benefit from RTL's more semantic approach:

### Discover Utils Package
- `src/platform/packages/shared/kbn-discover-utils/src/utils/nested_fields.test.ts`
- `src/platform/packages/shared/kbn-discover-utils/src/components/app_menu/app_menu_registry.test.ts`

### ES Query Package (7 files)
- `src/platform/packages/shared/kbn-es-query/src/filters/build_filters/exists_filter.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/filters/build_filters/phrases_filter.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/filters/build_filters/phrase_filter.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/filters/build_filters/get_filter_field.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/filters/build_filters/range_filter.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/es_query/from_nested_filter.test.ts`
- `src/platform/packages/shared/kbn-es-query/src/es_query/from_combined_filter.test.ts`

### Unified Data Table Package (6 files)
- `src/platform/packages/shared/kbn-unified-data-table/src/components/data_table_footer.test.tsx`
- `src/platform/packages/shared/kbn-unified-data-table/src/components/data_table_summary_column_header.test.tsx`
- `src/platform/packages/shared/kbn-unified-data-table/src/components/build_edit_field_button.test.tsx`
- `src/platform/packages/shared/kbn-unified-data-table/src/components/build_copy_column_button.test.tsx`

### Other component test files with similar patterns across various packages...

## Conversion Benefits

Converting these files to React Testing Library would provide:

1. **Better User-Centric Testing**: RTL focuses on testing components as users interact with them
2. **Improved Maintainability**: Less brittle tests that don't break on implementation changes
3. **Better Accessibility Testing**: RTL encourages testing with accessibility in mind
4. **Consistent Testing Patterns**: Align with modern React testing best practices
5. **Future-Proof**: Enzyme is deprecated while RTL is actively maintained

## Recommended Conversion Order

1. **Start with Data View Field Editor** (11 files) - All use enzyme shallow, relatively isolated
2. **Data View Management** (15 files) - Similar patterns, good learning opportunity
3. **Unified packages** - Modern components that would benefit most from RTL
4. **Discover plugin** - Complex components but high impact
5. **Data plugin** - Largest impact but also most complex

Each conversion should include:
- Replacing enzyme imports with RTL
- Converting shallow/mount to render()
- Replacing .find() with RTL queries (getByRole, getByText, etc.)
- Adding proper user interaction testing with userEvent
- Ensuring accessibility compliance through RTL patterns
