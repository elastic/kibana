# @kbn/data-grid-in-table-search

This package allows to extend `EuiDataGrid` with in-table search.

If you are already using `UnifiedDataTable` component, you can enable in-table search simply by passing `enableInTableSearch` prop to it.

If you are using `EuiDataGrid` directly, you can enable in-table search by importing this package and following these steps:

1. include `useDataGridInTableSearch` hook in your component 
2. pass `inTableSearchControl` to `EuiDataGrid` inside `additionalControls.right` prop or `renderCustomToolbar`
3. pass `inTableSearchCss` to the grid container element as `css` prop
4. update your `renderCellValue` to accept `inTableSearchTerm` and `onHighlightsCountFound` props
5. update your `renderCellValue` to wrap the cell content with `InTableSearchHighlightsWrapper` component.

Examples could be found inside `kbn-unified-data-table` package or in this [tmp commit](https://github.com/elastic/kibana/pull/206454/commits/2c56de09341ee9ce20c0f78ee6a89da0347014f0).






