# @kbn/ui-developer-toolbar

Developer toolbar shell with built-in monitors (environment, frame jank, memory, console errors) and a registry for custom items.

**Portability:** candidate for extraction to Cloud UI. The package has no `@kbn/*` runtime dependencies and builds to a standalone tarball via `packaging/scripts/build.sh`.

## Layout

Each source keeps its original structure under its own folder in `src/`:

- `src/toolbar/` — the toolbar shell and its built-in monitors (`toolbar_items/`).
- `src/lib/` — package-only helpers that replace Kibana packages (`platform.ts` for `isMac`).

## Exports

- `DeveloperToolbar` — the toolbar; render once per page. Props are listed [below](#developertoolbar-props).
- `DeveloperToolbarItem` — registers a custom item (`id`, `children`, `priority`) from anywhere in the tree.
- `useToolbarState` — access registered items and enabled/disabled settings.
- Types: `DeveloperToolbarProps`, `DeveloperToolbarItemProps`, `DeveloperToolbarState`, `DeveloperToolbarRegisteredItem`, `EnvironmentInfo`.

## DeveloperToolbar props

| Prop | Description | Default |
| --- | --- | --- |
| `envInfo` | Environment details for the environment badge (shape-compatible with Kibana's `PluginInitializerContext.env`). | none (badge hidden) |
| `onHeightChange` | Called with the height the host should reserve (`0` when minimized). | none |
| `disableHint` | Hint in the toggle tooltip explaining how to disable the toolbar. | `Disable the developer toolbar in your app configuration` |
| `iconType` | Environment badge icon in production mode (development mode always shows `wrench`). | `logoKibana` |
| `portal` | Portals the expanded toolbar to `document.body`, fixed to the bottom of the viewport. | `false` |

## Host requirements

- Peer dependencies: `react`, `react-dom`, `@elastic/eui`, `@emotion/react`, `@emotion/css`.
- Render inside an `EuiProvider`.
- Reserve space via `onHeightChange`, or pass `portal` to fix the toolbar to the bottom of the viewport.
- State is shared through `globalThis.__KIBANA_DEVELOPER_TOOLBAR_CTX__` and persisted in `kbn_developer_toolbar_*` localStorage keys.

Kibana wiring (mounting, `registerItem` API, Kibana-specific items such as the color theme toggle) lives in the `developerToolbar` plugin (`src/platform/plugins/shared/developer_toolbar`). See [`docs-dev/kbn-ui/developer-toolbar.md`](../../../../docs-dev/kbn-ui/developer-toolbar.md).
