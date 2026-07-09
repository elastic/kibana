---
navigation_title: Getting started
description: A step-by-step path to a working Content List, from labels and data through page ownership, columns, and saved-object features.
---

# Getting started with Content List

Start with the facade package unless you have a specific reason to import a lower-level package:

```tsx
import {
  ContentList,
  ContentListProvider,
  ContentListToolbar,
  ContentListTable,
  ContentListFooter,
} from '@kbn/content-list';
```

The declarative children used below (`Column`, `Action`, `Filters`) are namespaces on `ContentListTable` and `ContentListToolbar`; destructure them once, e.g. `const { Column, Action } = ContentListTable;` and `const { Filters } = ContentListToolbar;`.

## Step 1: provide labels and data

Labels are user-facing and should be i18n-translated in production code. The datasource's `findItems` receives `{ searchQuery, filters, sort, page, signal }` and returns `{ items, total }`, where `items` is `ContentListItem[]`.

```tsx
const labels = {
  entity: i18n.translate('myPlugin.listing.entity', { defaultMessage: 'dashboard' }),
  entityPlural: i18n.translate('myPlugin.listing.entityPlural', { defaultMessage: 'dashboards' }),
};

const dataSource = {
  findItems: async ({ searchQuery, filters, sort, page, signal }) => {
    return myService.find({ searchQuery, filters, sort, page, signal });
  },
};
```

## Step 2: render the list region

:::{storybook}
:id: kibana:content_management:content-list-examples--minimal
:::

:::{literalinclude} ../../examples/content_list/minimal_list.example.tsx
:language: tsx
:::

## Step 3: choose page ownership

If your feature owns the page, wrap the list in `KibanaContentListPage` (from `@kbn/content-list-page`). If your feature already has page chrome, render the list region directly inside that chrome.

:::{storybook}
:id: kibana:content_management:content-list-examples--standard-page
:::

:::{literalinclude} ../../examples/content_list/standard_kibana_page.example.tsx
:language: tsx
:::

## Step 4: customize the table

Use declarative columns when the default Name column is not enough. JSX order is column order.

:::{storybook}
:id: kibana:content_management:content-list-examples--custom-column
:::

:::{literalinclude} ../../examples/content_list/custom_column.example.tsx
:language: tsx
:::

## Step 5: add saved-object capabilities

Add saved-object services only when the listing needs them. Tags, favorites, and user profiles are opt-in and wired in two places: pass the clients on the provider's `services` prop (`services={{ tags, favorites, userProfiles }}`) and enable the corresponding entries on `features` (for example `features={{ tags, starred, userProfiles }}`).

:::{storybook}
:id: kibana:content_management:content-list-examples--filters
:::

:::{literalinclude} ../../examples/content_list/filters.example.tsx
:language: tsx
:::

