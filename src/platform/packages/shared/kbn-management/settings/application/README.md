---
id: management/settings/application
slug: /management/settings/application
title: Management Settings Application
description: A package containing a component for rendering the Settings page.
tags: ['management', 'settings']
date: 2023-09-27
---

## Description

This package contains a component for rendering the Settings page that contains a `Form` component for displaying and changing the available uiSettings.
The settings application also handles the logic for filtering out the uiSettings that are not in the allowlist.

## Setting definitions and loading states

The browser-side UI settings client (`settings.client`) only holds slim runtime
entries: the current value, type and a few operational flags. Display metadata
such as `name`, `description`, `category` and `options` is **not** included in
the bootstrap payload. Any page that needs to render a settings form must fetch
the full definitions from the server:

```ts
const definitions = await settings.metadata.getAll('namespace'); // or 'global'
```

The result is then merged with the client's runtime values using
`mergeSettingDefinitions` from `@kbn/management-settings-utilities` to produce
complete field objects.

Because this is an asynchronous request, pages that display settings must handle
two additional states:

- **Loading** — the definitions request is in flight. Show a spinner or other
  loading indicator and disable any search or filter controls.
- **Error** — the definitions request failed. Show an inline error (such as a
  `KbnDangerCallout` from `@kbn/ui-callout`) in the place where the settings
  would appear.

### How this page handles it

`SettingsApplication` renders the title, search bar, tabs and tab callout
immediately. While loading, it disables the search box and Category filter and
shows a centered spinner where the settings form goes. If the request fails, it
replaces the spinner with a danger callout. The loaded state is identical
regardless of whether definitions were fetched quickly or slowly.

### Other pages that fetch setting definitions

Several plugin pages outside of Advanced Settings also display editable UI
settings. They use a shared `useEditableSettings` hook (from
`@kbn/observability-shared-plugin` or a local copy) or React Query to fetch
definitions. Each page is responsible for its own loading and error UI:

- **GenAI Settings** (`gen_ai_settings`) — spinner and callout inside the
  General panel.
- **APM general settings** (`apm`) — spinner and callout under the settings
  tabs.
- **Profiling settings** (`profiling`) — one spinner per section panel while
  loading, a single callout at the top on error.
- **Observability AI Assistant settings tab**
  (`observability_ai_assistant_management`) — spinner and callout above the
  Log sources row.

If you add a new page that renders UI settings, follow the same pattern: fetch
definitions with `settings.metadata.getAll`, merge them with
`mergeSettingDefinitions`, and provide loading and error states.
