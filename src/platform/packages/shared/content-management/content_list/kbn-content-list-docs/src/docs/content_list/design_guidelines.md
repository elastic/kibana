---
navigation_title: Design guidelines
description: How to make a Content List feel like a native Kibana listing page, covering layout, filters, columns, states, and actions.
---

# Content List design guidelines

Content List should feel like a native Kibana listing page: dense enough for repeated work, predictable in structure, and consistent across content types.

## Page layout

Use `KibanaContentListPage` for standard full-page listings. It keeps the heading and section relationship accessible and avoids the width constraints that make wide tables feel cramped.

Use direct composition when the list is part of a larger feature surface, such as a tab body, flyout section, or custom page.

## Toolbar and filters

Put search first, then the filters users need most often. Prefer built-in filter presets for sort, tags, starred, and created-by before creating custom popovers.

Use explicit filter children when order matters (`Filters` is `ContentListToolbar.Filters`):

```tsx
<ContentListToolbar>
  <Filters>
    <Filters.Starred />
    <Filters.Tags />
    <Filters.CreatedBy />
    <Filters.Sort />
  </Filters>
</ContentListToolbar>
```

:::{storybook}
:id: kibana:content_management:content-list-examples--filters
:::

:::{literalinclude} ../../examples/content_list/filters.example.tsx
:language: tsx
:::

## Columns

Prefer the built-in column presets for common listing semantics. Use custom columns when the content type has an important domain-specific field. Keep text-bearing columns readable with `minWidth`, and avoid allowing metadata columns to absorb all remaining width.

:::{storybook}
:id: kibana:content_management:content-list-examples--custom-column
:::

:::{literalinclude} ../../examples/content_list/custom_column.example.tsx
:language: tsx
:::

## Empty, loading, and filtered states

Use the phase model to distinguish first load, truly empty, filtering, filtered-empty, and populated states. Read the current phase with `useContentListPhase`, which returns a `ContentListPhase`:

| Phase | When |
|---|---|
| `initialLoad` | First fetch before any data has arrived. |
| `empty` | Content type has zero objects and no query is active. |
| `filtering` | A query is active and updated results are still loading. |
| `filtered` | A query is active and returned zero hits. |
| `populated` | Items are available to render. |

The default empty state is fine for generic cases, but product-owned listings should provide helpful copy and primary actions.

:::{storybook}
:id: kibana:content_management:content-list-examples--empty-states
:::

:::{literalinclude} ../../examples/content_list/empty_states.example.tsx
:language: tsx
:::

## Actions

Keep row actions short and predictable. Declare action handlers once on the provider's `item.actions` (for example `edit.getItemActionHref` or `delete.onBulkAction`) so the table stays declarative. Gate actions with a `restriction` callback that returns a reason string for disallowed items, and use `partitionByRestriction` to split a selection into allowed and skipped sets rather than hiding individual buttons. Put destructive actions behind confirmation flows with `DeleteConfirmationModal` and `useDeleteConfirmation`.

:::{storybook}
:id: kibana:content_management:content-list-examples--delete-flow
:::

:::{literalinclude} ../../examples/content_list/delete_flow.example.tsx
:language: tsx
:::

