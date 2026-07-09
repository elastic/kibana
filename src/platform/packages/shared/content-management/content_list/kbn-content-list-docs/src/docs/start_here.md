---
navigation_title: Start here
description: Orientation for Content List and the Assembly pattern, with a package map and links to the task-oriented guides.
---

# Start here

Content List is the shared way to build Kibana listing experiences for saved-object-like content. It gives teams a consistent provider, toolbar, table, footer, page shell, empty state, selection, filtering, sorting, and mutation model without forcing every app to rebuild the same listing patterns.

Assembly is the declarative component pattern used by Content List for configurable children such as table columns, toolbar filters, and row actions. It lets a consumer write JSX that looks like the UI they want:

```tsx
<ContentListTable>
  <Column.Name showDescription />
  <Column.UpdatedAt />
  <Column.Actions>
    <Action.Edit />
    <Action.Delete />
  </Column.Actions>
</ContentListTable>
```

`Column` and `Action` are namespaces exposed on `ContentListTable` (and also re-exported directly from `@kbn/content-list`); `Filters` is exposed on `ContentListToolbar`.

## Choose your path

Use **Content List** docs when you are migrating a listing page, building a new listing page, adding filters or columns, or deciding which package to import.

Use **Assembly** docs when you are designing a declarative component API, adding a new declarative part or preset, or debugging how JSX children are parsed and resolved.

## Package map

| Package | Use it for |
|---|---|
| `@kbn/content-list` | Default facade for portable list-region building blocks. |
| `@kbn/content-list-page` | Kibana-specific page shell for full-page listing experiences. |
| `@kbn/content-list-provider` | Core provider and hooks for data, query, selection, phases, and mutations. |
| `@kbn/content-list-provider-client` | Migration-friendly adapter for `TableListView`-style `findItems` functions. |
| `@kbn/content-list-table` | Declarative table columns and row actions. |
| `@kbn/content-list-toolbar` | Declarative toolbar filters and search. |
| `@kbn/content-list-footer` | Pagination footer. |
| `@kbn/content-list-assembly` | Generic Assembly factory for declarative component APIs. |

The facade `@kbn/content-list` re-exports the provider, toolbar, table, and footer building blocks, but not `KibanaContentListPage` (import from `@kbn/content-list-page`) or `ContentListClientProvider` (import from `@kbn/content-list-provider-client`). Each package also ships a `README.md` with API-level reference; these guides are the task-oriented tour.

## A minimal Content List

:::{storybook}
:id: kibana:content_management:content-list-examples--minimal
:::

:::{literalinclude} ../examples/content_list/minimal_list.example.tsx
:language: tsx
:::

## A minimal Assembly

:::{storybook}
:id: kibana:content_management:assembly-examples--basic-action-bar
:::

:::{literalinclude} ../examples/assembly/basic_action_bar.example.tsx
:language: tsx
:::

