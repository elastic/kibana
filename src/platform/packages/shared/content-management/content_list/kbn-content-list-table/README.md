# @kbn/content-list-table

Table component for rendering content listings with configurable columns. Wraps `EuiBasicTable` and integrates with `ContentListProvider` for data, sorting, and state management.

## Usage

The table renders inside a `ContentListProvider` and reads items, loading state, and configuration from context.

```tsx
import { ContentListTable } from '@kbn/content-list-table';

// Defaults to a Name column.
<ContentListTable title="Dashboards" />
```

### Custom columns

Use the `Column` compound component to declare columns as children. Order in JSX determines order in the table.

```tsx
const { Column } = ContentListTable;

<ContentListTable title="Dashboards">
  <Column.Name />
  <Column.UpdatedAt />
  <Column
    id="status"
    name="Status"
    width="12em"
    minWidth="10em"
    maxWidth="16em"
    truncateText
    render={(item) => <EuiBadge>{item.status}</EuiBadge>}
  />
</ContentListTable>
```

Column sizing props (`width`, `minWidth`, `maxWidth`, `truncateText`) map to `EuiBasicTable` column layout props. Prefer `em` units for text columns, set `minWidth` so headers remain readable, and set `maxWidth` so user content cannot stretch the table too far. `Column.Actions` is sticky by default for tables with horizontal overflow.

`Column.Name` uses the provider-level `item.getHref` link by default. Passing `onClick` makes the title use that click handler instead of `getHref`; set `shouldUseHref` to preserve native link affordances such as Cmd/Ctrl-click while handling plain clicks with `onClick`.

### Available column presets

| Component | Description |
|-----------|-------------|
| `Column.Name` | Title with optional description and inline tag badges. |
| `Column.UpdatedAt` | Relative timestamp from `item.updatedAt`. |
| `Column.CreatedBy` | User avatar resolved via `ProfileCache`. Clickable to toggle `createdBy` filter. |
| `Column.Starred` | Star toggle using the favorites service. Requires `services.favorites` on the provider. |
| `Column.Actions` | Row-level action buttons (edit, delete). Configurable via `item` props on the provider. |

Custom columns use the `Column` component with `id`, `name`, and `render` props.

### Defaults

Each preset bakes in `width` / `minWidth` / `maxWidth` defaults so listings look consistent out of the box. The defaults follow a shared three-layer contract:

- **`width`** — preferred English baseline. Drives the look users see most of the time. Every preset ships with one so each column has a deterministic preferred footprint.
- **`minWidth`** — the floor. For text-bearing presets this defaults to the CSS keyword `'max-content'`, which lets the header expand to fit a translated label (e.g. de "Letzte Aktualisierung") without truncation. `min-width` wins over `max-width` per the CSS spec, so the floor never fights the cap. `Column.Name` instead pins a fixed `'18em'` floor because user-supplied titles can be arbitrarily long.
- **`maxWidth`** — the cap. Always pinned to the same value as `width`. The cap is advisory on its own (browsers ignore `max-width` on table cells per the [CSS Tables spec](https://drafts.csswg.org/css-tables/#computing-the-table-width)), but the matching `width` does the actual locking — together they keep the column at its preferred footprint regardless of available slack.

| Preset | `width` | `minWidth` | `maxWidth` | Notes |
|---|---|---|---|---|
| `Column.Name` | `64em` | `18em` | `64em` | `64em` (~896px) is a comfortable reading-line ceiling. The browser shrinks Name from `width` toward `minWidth` first when the viewport gets too narrow to fit every column at its preferred width. |
| `Column.UpdatedAt` | `9.5em` | `'max-content'` | `9.5em` | Locked at `9.5em` in English. Long-text locales expand the column via the `'max-content'` floor. |
| `Column.CreatedBy` | `88px` | `'max-content'` | `88px` | Header (~75px) plus breathing room for the centred 24px avatar. |
| `Column.Starred` | `40px` | `40px` | `40px` | Pure icon column — header is a 16px `EuiIcon`. No locale exposure, so no `'max-content'` floor. |
| `Column.Actions` | _(auto from action count)_ | `'max-content'` | _(equal to derived width)_ | Width still computed by the `36N + 12` formula. `'max-content'` floor lets translated headers expand the column when wider than the icon row. |

#### Trailing whitespace on wide pages

`ContentListTable` renders a CSS `::after` pseudo-cell on every `<tr>` (`tr::after { display: table-cell; content: ''; }`). The browser treats it as an anonymous, unsized table cell for layout purposes, so on a wide page it becomes the only column without an explicit `width` and absorbs all the leftover horizontal space. Populated columns sit left-aligned at their preferred widths and the trailing whitespace lives _after_ the last populated column, all the way to the right edge of the table.

On viewports too narrow to fit all preferred widths the pseudo-cell collapses (no slack to absorb) and the browser shrinks the populated columns proportionally; `Column.Name` shrinks first because it has the most range between its `width` and `minWidth`. No consumer action needed for either case.

There is no DOM, accessibility, or clipboard impact: the rendered table has exactly the columns you declared, screen readers read the correct column count, and copying rows into a spreadsheet doesn't add a trailing tab. See `cssTrailingSpacer` in `content_list_table.tsx` for the rationale and the alternatives that were considered.

#### Wide-viewport `Column.Name` upgrade

On viewports ≥ `2560px` (common 4K external displays), `ContentListTable` widens `Column.Name` from `64em` to `90em` via a media-query CSS override (`cssWideViewportNameWidth` in `content_list_table.tsx`). The trailing pseudo-cell still absorbs whatever horizontal slack remains, so populated sibling columns (`UpdatedAt`, `CreatedBy`, `Actions`, etc.) stay at their preferred footprints; only the Name column / spacer ratio shifts. Because EUI applies `width` / `max-width` as inline styles, the rule uses `!important` and so applies regardless of consumer-supplied `width` overrides — the wide-viewport bump is a cross-cutting layout decision rather than a per-instance default.

#### Overriding defaults

There are two ways to opt out of a baked-in default:

- **Replace** with another value: `<Column.UpdatedAt width="14em" />` swaps the `9.5em` default for `14em`. Useful when you want a different size, not "no constraint".
- **Clear** with explicit `undefined`: `<Column.Name width={undefined} maxWidth={undefined} />` skips the default entirely — no `width` or `max-width` style is emitted, and the column becomes the slack absorber on wide viewports (taking the slack that would otherwise land in the trailing pseudo-cell). Distinct from omitting the prop, which falls back to the documented default.

A consumer-supplied `width` also re-anchors the `maxWidth` default — so `<Column.UpdatedAt width="14em" />` produces `width: 14em; max-width: 14em;` (the column stays locked at the new preferred footprint).

Use `KibanaContentListPage` for the page chrome — it disables EUI's 1200px `restrictWidth` cap by default so the table actually runs to the full page width and the trailing pseudo-cell has slack to absorb. Pass `restrictWidth={true}` (or a specific value) to opt back in.

