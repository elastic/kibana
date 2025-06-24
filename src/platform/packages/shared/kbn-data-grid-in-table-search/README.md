# @kbn/data-grid-in-table-search

This package allows to extend `EuiDataGrid` with in-table search.

If you are already using `UnifiedDataTable` component, you can enable in-table search simply by passing `enableInTableSearch` prop to it.

```tsx
    <UnifiedDataTable
      enableInTableSearch={true}
      // ... other props
    />
```

If you are using `EuiDataGrid` directly, you can enable in-table search by importing this package and following these steps:

1. include `useDataGridInTableSearch` hook in your component 
2. pass `inTableSearchControl` to `EuiDataGrid` inside `additionalControls.right` prop or `renderCustomToolbar`
3. pass `inTableSearchCss` to the grid container element as `css` prop
4. update your `cellContext` prop with `cellContextWithInTableSearchSupport`
5. update your `renderCellValue` prop with `renderCellValueWithInTableSearchSupport`.

```tsx
    import { useDataGridInTableSearch } from '@kbn/data-grid-in-table-search';
    
    // ...
    
    const dataGridRef = useRef<EuiDataGridRefProps>(null);
    const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);
    
    // ...

    const { inTableSearchTermCss, inTableSearchControl, cellContextWithInTableSearchSupport, renderCellValueWithInTableSearchSupport } =
      useDataGridInTableSearch({
        dataGridWrapper,
        dataGridRef,
        visibleColumns,
        rows,
        cellContext,
        renderCellValue,
        pagination,
      });
    
    const toolbarVisibility: EuiDataGridProps['toolbarVisibility'] = useMemo(
      () => ({
        additionalControls: inTableSearchControl ? { right: inTableSearchControl } : false,
        // ...
      }),
      [inTableSearchControl]
    );
  
    // ...
    <div ref={(node) => setDataGridWrapper(node)} css={inTableSearchCss}>
      <EuiDataGrid
        ref={dataGridRef}
        toolbarVisibility={toolbarVisibility}
        renderCellValue={renderCellValueWithInTableSearchSupport}
        cellContext={cellContextWithInTableSearchSupport}
        pagination={pagination}
        // ... other props
      />
    </div>
```

An example of how to use this package can be found in `kbn-data-grid-in-table-search/__mocks__/data_grid_example.tsx` 
or in `kbn-unified-data-table` package.






