# @kbn/shared-ux-table-persist

This package contains the `useEuiTablePersist` hook that can be used in components
containing Eui tables for storing their page size ("rows per page" value) or
the current sort criteria in local storage so that the user's preferences for
these properties can persist.

The package also exports some table-related constants (e.g. `DEFAULT_PAGE_SIZE_OPTIONS`)
for use across tables in Kibana Stack Management for consistency.

Usage:

```
interface Props {
  items: T[];
}

const MyTableComponent: FunctionComponent<Props> = ({ items }) => {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
    },
    ...
  ];

  const { pageSize, sorting, onTableChange } = useEuiTablePersist<T>({
    tableId: 'myTableId',
    initialPageSize: 50,
    initialSort: {
      field: 'name',
      direction: 'asc',
    },
  });

  const pagination = {
    pageSize,
    pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
  };

  return (
    <EuiInMemoryTable
      items={items}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
    />
  );
};
```
