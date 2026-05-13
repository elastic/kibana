# @kbn/core-hotkeys-browser

This package contains the public types for core's browser-side hotkeys service.

## Feature tagging and shortcuts sidebar

- **`HotkeyDefinition.featureId`** — Optional stable id (e.g. `myPlugin:myFeature`) set **at registration only**. Use it to tie shortcuts to a feature area; it is **not** mutable via `HotkeyHandle.update`. To change it, unregister and register again (or use a new hotkey id).
- **`HotkeyDefinition.group`** — Optional human-facing heading (often i18n) for the cheat sheet; not a substitute for `featureId`.

Consumers can open the keyboard shortcuts sidebar focused on a feature:

```ts
chrome.sidebar
  .getApp<HotkeysSidebarState, HotkeysSidebarActions>('hotkeys')
  .actions?.openToFeature('myPlugin:myFeature');
```

That pre-fills the panel search so matching shortcuts appear first; clearing or editing the search shows shortcuts across the rest of Kibana.
