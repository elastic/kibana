# Content List Playground

This playground lets you compose a Content List page interactively and see the result — including the generated JSX — in real time.

## Layout

A Content List page is built from four composable packages:

| Component | Purpose |
|---|---|
| `ContentListProvider` | Wraps the page, owns data-fetching, state, and configuration. |
| `ContentListToolbar` | Search bar, filters, and bulk-selection actions. |
| `ContentListTable` | The data table with configurable columns. |
| `ContentListFooter` | Pagination controls. |

All three child components read their state from the provider via context, so they must be rendered inside `<ContentListProvider>`.

## Builder panel (left)

The JSX-shaped tree on the left mirrors the component hierarchy you are building. Each node has inline controls:

- **Provider props** — toggle features like sorting, pagination, search, and the content editor flyout (`features.contentEditor.open`); set entity labels; enable item-level navigation (`getHref`) and action handlers (`actions.edit`, `actions.delete`).
- **Columns** — drag to reorder, click the arrow to edit props (`width`, `columnTitle`, etc.), or press ✕ to remove.
- **Actions** — nested inside `Column.Actions`; drag to reorder or remove.
- **Filters** — toolbar filter components like `Filters.Sort`.

Use the **component palette** below the tree to add columns, actions, or filters.

## Available columns

| Component | Description |
|---|---|
| `Column.Name` | Linked title with optional description. |
| `Column.UpdatedAt` | Relative or absolute timestamp. |
| `Column (Type)` | Custom column rendering `item.type` as a badge — demonstrates the base `Column` API. |
| `Column.Actions` | Row-level action buttons (edit, delete, custom). |

> **Tip:** Each preset (`Column.Name`, `Column.UpdatedAt`, `Column.CreatedBy`, `Column.Starred`, `Column.Actions`) ships with sensible default `width` / `minWidth` / `maxWidth`, so the `width` input in the builder is an **override** — leave it blank to use the default. See the package README's _Defaults_ section for the full table.

## Available actions

Actions are children of `Column.Actions`:

| Component | Description |
|---|---|
| `Action.Edit` | Opens the item for editing (requires `actions.edit.onItemAction`). |
| `Action.ContentEditor` | Opens the Kibana content editor flyout (requires `features.contentEditor.open`). The action self-skips when the open callback isn't wired. |
| `Action.Delete` | Triggers a delete-confirmation modal (requires `actions.delete.onBulkAction`). |
| `Action (Export)` | Custom action example — demonstrates the base `Action` API. Behavior is supplied via `actions.export.onItemAction` on the provider's item config. |

> **Tip:** If `Column.Actions` is present but no item callbacks are enabled on the provider and no custom actions are present, the column is hidden. Look for the ⚠ warning icon in the builder panel.

## Simulation controls

The panel at the top of the builder lets you simulate different data states without changing any configuration:

- **Items** — set the total number of items returned by the mock data source.
- **Empty** — force an empty result set to preview the empty state.
- **Loading** — keep the table in a perpetual loading state.

## Generated JSX

The Preview tab includes a generated JSX code block at the bottom. This is the markup a consumer would write to reproduce the same page.
