# @kbn/esql-datagrid

Contains a Discover-like table specifically for ES|QL queries:
 - You have to run the esql query on your application, this is just a UI component
 - You pass the columns and rows of the _query response to the table
 - The table operates in both Document view and table view mode, define this with the `isTableView` property
 - The table offers a built in Row Viewer flyout
 - The table offers a rows comparison mode, exactly as Discover

---

### Properties
 * rows: ESQLRow[], is the array of values returned by the _query api
 * columns: DatatableColumn[], is the array of columns in a kibana compatible format. You can sue the `formatESQLColumns` helper function from the `@kbn/esql-utils` package
 * query: AggregateQuery, the ES|QL query in the format of
 ```json
 {
  esql: <queryString>
 }
 ```
 * flyoutType?: "overlay" | "push", defines the type of flyout for the Row Viewer
 * isTableView?: boolean, defines if the table will render as a Document Viewer or a Table View


### How to use it
```tsx
import { getIndexPatternFromESQLQuery, getESQLAdHocDataview, formatESQLColumns } from '@kbn/esql-utils';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';

/**
  Run the _query api to get the datatable with the ES|QL query you want. 
  This will return a response with columns and values
**/

const indexPattern = getIndexPatternFromESQLQuery(query);
const adHocDataView = getESQLAdHocDataview(indexPattern, dataViewService);
const formattedColumns = formatESQLColumns(columns);

<ESQLDataGrid
  rows={values}
  columns={formattedColumns}
  dataView={adHocDataView}
  query={{ esql: query }}
  flyoutType="overlay"
  isTableView
/>
```
