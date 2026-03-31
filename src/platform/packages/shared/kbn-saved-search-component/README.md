# @kbn/saved-search-component

A component wrapper around Discover session embeddable. This can be used in solutions without being within a Dashboard context.

This can be used to render a context-aware (logs etc) "document table".

In the past you may have used the Log Stream Component to achieve this, this component supersedes that.

## Basic usage

```tsx
import { LazySavedSearchComponent } from '@kbn/saved-search-component';

<LazySavedSearchComponent
    dependencies={{
        embeddable: dependencies.embeddable,
        savedSearch: dependencies.savedSearch,
        dataViews: dependencies.dataViews,
        searchSource: dependencies.searchSource,
    }}
    index={anIndexString}
    filters={optionalFilters}
    query={optionalQuery}
    timestampField={optionalTimestampFieldString}
    displayOptions={{
        solutionNavIdOverride: 'oblt',
        enableDocumentViewer: true,
        enableFilters: false,
    }}
/>
```

## Persisting state across remounts

The component accepts an `onTableConfigChange` callback that fires when users customize the table (e.g., change columns, sort, grid settings). This allows you to persist table configuration externally (e.g., in URL params, local storage, or application state).

**Important**: Most state properties (`sort`, `grid`, `rowHeight`, `rowsPerPage`, `density`) are applied **only on mount**. If you need state to persist across remounts (e.g., navigating between pages), store the state externally and pass it back as props on next mount. Only `columns` supports incremental updates while mounted.

```tsx
import { LazySavedSearchComponent, type SavedSearchTableConfig } from '@kbn/saved-search-component';

function MyComponent() {
  const [tableConfig, setTableConfig] = useState<SavedSearchTableConfig>();
  
  const handleTableConfigChange = (config: SavedSearchTableConfig) => {
    // Persist to URL, local storage, etc.
    setTableConfig(config);
  };

  return (
    <LazySavedSearchComponent
      dependencies={dependencies}
      index={indexPattern}
      // Pass persisted table config as initial props
      columns={tableConfig?.columns}
      sort={tableConfig?.sort}
      grid={tableConfig?.grid}
      rowHeight={tableConfig?.rowHeight}
      rowsPerPage={tableConfig?.rowsPerPage}
      density={tableConfig?.density}
      // Receive updates
      onTableConfigChange={handleTableConfigChange}
      // Query is typically controlled separately by parent
      query={myControlledQuery}
      {...otherProps}
    />
  );
}
```

The `SavedSearchTableConfig` interface includes:
- `columns`: Array of column field names (supports incremental sync)
- `sort`: Sort configuration (initial state only)
- `grid`: Grid settings like column widths (initial state only)
- `rowHeight`: Row height setting (initial state only)
- `rowsPerPage`: Number of rows per page (initial state only)
- `density`: Grid density - compact, normal, expanded (initial state only)

**Note**: `query` is a prop but not part of `SavedSearchTableConfig` - it's typically controlled separately by the parent component since it's often derived from application state rather than user customization.
