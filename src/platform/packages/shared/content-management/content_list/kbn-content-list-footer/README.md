# @kbn/content-list-footer

Footer component for content list UIs. Renders pagination controls that match the layout of `EuiBasicTable`'s `PaginationBar` ("Rows per page" on the left, page buttons on the right).

## Usage

The footer renders inside a `ContentListProvider` and auto-configures from the provider. When pagination is enabled, it renders `EuiTablePagination`. When pagination is disabled, it renders nothing.

```tsx
import { ContentListFooter } from '@kbn/content-list-footer';

<ContentListProvider id="my-list" ...>
  <ContentListTable />
  <ContentListFooter />
</ContentListProvider>
```

### Pagination behavior

- Renders when `features.pagination` is not `false` in the provider.
- Page size changes are persisted to `localStorage`.
- Changing the sort or page size resets to page 0.

## Pure component

`PaginationComponent` is the pure presentational counterpart. It accepts all data as props with no provider dependency, making it suitable for unit testing or standalone rendering.

```tsx
import { PaginationComponent } from '@kbn/content-list-footer';

<PaginationComponent
  pageIndex={0}
  pageSize={20}
  totalItems={100}
  pageSizeOptions={[10, 20, 50]}
  onPageChange={setPageIndex}
  onPageSizeChange={setPageSize}
/>
```
