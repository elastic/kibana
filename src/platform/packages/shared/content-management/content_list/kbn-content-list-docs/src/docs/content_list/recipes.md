---
navigation_title: Recipes
description: Copyable starting points for common Content List tasks, from the smallest list to custom columns, filters, empty states, and actions.
---

# Content List recipes

Recipes are copyable starting points for common listing tasks. Prefer the facade package unless the recipe explicitly needs a lower-level import. The `Column`, `Action`, and `Filters` children are namespaces on `ContentListTable` and `ContentListToolbar`.

## Create the smallest useful list

:::{storybook}
:id: kibana:content_management:content-list-examples--minimal
:::

:::{literalinclude} ../../examples/content_list/minimal_list.example.tsx
:language: tsx
:::

## Use the standard Kibana page shell

Use this when the listing owns the full page and should match other first-party Kibana listing pages.

:::{storybook}
:id: kibana:content_management:content-list-examples--standard-page
:::

:::{literalinclude} ../../examples/content_list/standard_kibana_page.example.tsx
:language: tsx
:::

## Embed the list in custom chrome

Use this when the listing is one region inside a larger feature-owned experience.

:::{storybook}
:id: kibana:content_management:content-list-examples--custom-shell
:::

:::{literalinclude} ../../examples/content_list/custom_shell.example.tsx
:language: tsx
:::

## Add a custom column

Use a custom `Column` when the field is specific to your content type and does not deserve a shared preset.

:::{storybook}
:id: kibana:content_management:content-list-examples--custom-column
:::

:::{literalinclude} ../../examples/content_list/custom_column.example.tsx
:language: tsx
:::

## Add saved-object filters

Use tags, starred, and created-by filters when your provider has the corresponding services configured.

:::{storybook}
:id: kibana:content_management:content-list-examples--filters
:::

:::{literalinclude} ../../examples/content_list/filters.example.tsx
:language: tsx
:::

## Provide a custom empty state

Use custom empty states when the content type has a clear first action or onboarding path.

:::{storybook}
:id: kibana:content_management:content-list-examples--empty-states
:::

:::{literalinclude} ../../examples/content_list/empty_states.example.tsx
:language: tsx
:::

## Add edit and delete actions

Use row actions with provider-level item handlers so the table stays declarative.

:::{storybook}
:id: kibana:content_management:content-list-examples--delete-flow
:::

:::{literalinclude} ../../examples/content_list/delete_flow.example.tsx
:language: tsx
:::

