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

The browser-side UI settings client (`settings.client`) only holds slim runtime entries: the current value, type, name, and a few operational flags such as `readonly`, `readonlyMode`, and `sensitive`. Display metadata such as `description`, `category` and `options` is **not** included in the bootstrap payload. Any page that needs to render a settings form must fetch the full definitions from the server:

```ts
const definitions = await settings.metadata.getAll('namespace'); // or 'global'
```

The result is then merged with the client's runtime values using `mergeSettingDefinitions` from `@kbn/management-settings-utilities` to produce complete field objects.

Because this is an asynchronous request, pages that display settings must handle two additional states:

- **Loading** — the definitions request is in flight. Show a spinner or other loading indicator and disable any search or filter controls.
- **Error** — the definitions request failed. Show an inline error (such as a `KbnDangerCallout` from `@kbn/ui-callout`) in the place where the settings would appear, with an action that calls `retry`.

If you add a new page that renders UI settings, use the hooks in `@kbn/management-settings-hooks` to fetch the definitions, and render their loading and error states. `useEditableSettings` covers a page that edits a fixed list of settings. `useSettingDefinitions` fetches the definitions alone, and is what both `useEditableSettings` and this package's Settings page build on.
