# @kbn/data-grid-in-table-search

This package allows to extend `EuiDataGrid` with in-table search.

To start using it:

1. include `useDataGridInTableSearch` hook in your component 
2. pass `inTableSearchControl` to `EuiDataGrid` inside `additionalControls.right` prop or `renderCustomToolbar`
3. pass `inTableSearchCss` to the grid container element as `css` prop
4. update your `renderCellValue` to accept `inTableSearchTerm` and `onHighlightsCountFound` props
5. update your `renderCellValue` to wrap the cell content with `InTableSearchHighlightsWrapper` component.




