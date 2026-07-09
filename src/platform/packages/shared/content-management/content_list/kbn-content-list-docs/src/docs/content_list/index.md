---
navigation_title: Content List
description: How Content List standardizes the Kibana list region, its provider-driven architecture, and how to choose a provider.
---

# Content List overview

Content List standardizes the list region of Kibana applications: fetch content, expose state through a provider, and render a toolbar, table, footer, empty state, and actions with consistent behavior.

The most common shape is:

```tsx
<ContentListProvider labels={labels} dataSource={dataSource}>
  <ContentList>
    <ContentListToolbar />
    <ContentListTable title="Dashboards" />
    <ContentListFooter />
  </ContentList>
</ContentListProvider>
```

## Architecture

The provider owns data fetching, query state, sorting, pagination, selection, feature support, and service integrations. The render components read from that provider and focus on layout and user interaction.

`ContentList` is intentionally only the list region. Use `KibanaContentListPage` (from `@kbn/content-list-page`) when the listing owns a full Kibana page, and compose `ContentList` directly when another feature owns the page chrome.

## Provider choices

Use `ContentListProvider` when your datasource already accepts structured list parameters. Its `findItems({ searchQuery, filters, sort, page, signal })` returns `{ items, total }`.

Use `ContentListClientProvider` (from `@kbn/content-list-provider-client`) when migrating from `TableListView` and you want to keep an existing `findItems(searchQuery, options, signal)` implementation that returns `{ hits, total }`, while Content List handles client-side filtering, sorting, and pagination.

## List-region composition

:::{storybook}
:id: kibana:content_management:content-list-examples--minimal
:::

:::{literalinclude} ../../examples/content_list/minimal_list.example.tsx
:language: tsx
:::

## Full-page composition

:::{storybook}
:id: kibana:content_management:content-list-examples--standard-page
:::

:::{literalinclude} ../../examples/content_list/standard_kibana_page.example.tsx
:language: tsx
:::

## Custom shell composition

:::{storybook}
:id: kibana:content_management:content-list-examples--custom-shell
:::

:::{literalinclude} ../../examples/content_list/custom_shell.example.tsx
:language: tsx
:::

