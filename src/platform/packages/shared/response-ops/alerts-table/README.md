# @kbn/response-ops-alerts-table

An abstraction on top of `EuiDataGrid` dedicated to rendering alert documents.

## Usage

In addition to `EuiDataGrid`'s functionality, the table manages the paginated and cached fetching of alerts, based on
the provided `ruleTypeIds` and `consumers` (the final query can be refined through the `query` and `initialSort` props).
The `id` prop is used to persist the table state in `localStorage`.

```tsx
<AlertsTable
  id="my-alerts-table"
  ruleTypeIds={ruleTypeIds}
  consumers={consumers}
  query={esQuery}
  initialSort={defaultAlertsTableSort}
  renderCellValue={renderCellValue}
  renderActionsCell={AlertActionsCell}
  services={{ ... }}
/>
```

## Columns

Just like in `EuiDataGrid`, the columns are customizable through the `columns` prop. In addition to those, the table
renders an "Actions" column with default alert call-to-actions and provides row selection and bulk actions
functionality.

```tsx
// The @kbn/rule-data-utils package exports constants
// for many common alert field keys
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

<AlertsTable columns={[
  {
    displayAsText: 'Rule',
    id: ALERT_RULE_NAME,
    initialWidth: 230,
  },
]} />
```

## Cells, popovers and flyouts

All the sub-components of the table are customizable through the `render*`
props (`renderCellValue`, `renderCellPopover`, `renderActionsCell`, etc.). Values passed to these props are treated as
components, allowing hooks, context, and other React concepts to be used.

```tsx
const CustomCellValue: GetAlertsTableProp<'renderCellValue'> = ({ alert }) => {
  // ...
};

<AlertsTable renderCellValue={CustomCellValue} />
```

## Render context

All the sub-component renderers receive as part of their props a context object (
see [EuiDataGrid's `cellContext`](https://eui.elastic.co/#/tabular-content/data-grid-cells-popovers%23cell-context))
with common utilities and services (i.e. the fetched alerts, loading states etc.).
You can add properties to this context by means of the `additionalContext` prop:

```tsx
<AlertsTable
  additionalContext={{
    myCustomProperty: 'my custom value',
  }}
  renderCellValue={({ myCustomProperty /*string*/ }) => {
    // ...
  }}
/>
```

The context type is inferred based on the `additionalContext` prop and all render functions props are typed accordingly.
To avoid prop drilling, you can use the `useAlertsTableContext` hook to access the same context in any sub-component.

```tsx
const CustomCellValue = ({ alert }) => {
  const { alertsCount, myCustomProperty } = useAlertsTableContext<MyAdditionalContext>();

  // ...
};
```

In order to define your custom sub-components separately from the table but still benefit from the context type
inference, you may want to extract props from the `AlertsTableProps` type. The `GetAlertsTableProp` utility type is
provided for this: it extracts the type of a specific prop from the `AlertsTableProps` type, excluding `undefined` in
case of optional props.

```tsx
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';

export const CustomCellValue: GetAlertsTableProp<'renderCellValue'> = ({ alert }) => {
  // ...
};
```

If you also have an additional context, you can define a type for it and wrap the `AlertsTableProps`, providing it as a
generic:

```tsx
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';

interface MyAdditionalContext {
  myCustomProperty: string;
}

export type MyAlertsTableProps = AlertsTableProps<MyAdditionalContext>;
export type GetMyAlertsTableProp<K extends keyof MyAdditionalContext> = Exclude<MyAlertsTableProps[K], undefined>;

export const CustomCellValue: GetMyAlertsTableProp<'renderCellValue'> = ({ myCustomProperty }) => {
  // ...
};

<AlertsTable<MyAdditionalContext>
  additionalContext={{
    myCustomProperty: 'my custom value',
  }}
  renderCellValue={CustomCellValue}
/>
```

## Dependencies

The table relies on the following Kibana services, expected in the `services` prop:

- `data`
- `http`
- `notifications`
- `fieldFormats`
- `application`
- `licensing`
- `settings`
- `cases` (optional)

## Integrations

The table has built-in integration with Maintenance Windows and Cases. If alerts have maintenance windows or cases
associated to them, they will be loaded and made available through the `maintenanceWindows` and `cases` properties of
the render context.
A special cell renderer is used by default for the `kibana.alert.maintenance_window_ids` and `kibana.alert.case_ids`
columns.

## Lazy loading

Contrary to the previous implementation exported by `triggersActionsUI`, this package doesn't prescribe how to lazy load
the table component; a default export is just provided for convenience. However, do consider that
the `React.lazy` function loses the original generic types of the component. To make the type inference work correctly,
you can assert the type of the lazy loaded component using a type import:

```tsx
import type { AlertsTable as AlertsTableType } from '@kbn/response-ops-alerts-table';

const AlertsTable = React.lazy(() => import('@kbn/response-ops-alerts-table')) as AlertsTableType;
```

## Mocking

When mocking the table, keep in mind that the component is manually typed as a normal function component (to keep its
generic types), but it's actually a memoized, forwardRef'ed component. To mock it properly, mock the entire module:

```tsx
jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn().mockImplementation(() => <div data-test-subj="alerts-table"/>),
}));
```

## What's new compared to `triggersActionsUI`?

- The alerts table registry was removed. The table is now a standalone component and the configuration is based entirely
  on props.
- All the custom renderers (cell, cell popover, actions cell, etc.) are now exposed as strongly typed props (`render*`).
- More `EuiDataGrid` props are exposed for customization.
