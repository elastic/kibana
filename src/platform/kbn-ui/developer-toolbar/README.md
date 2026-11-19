# @kbn/ui-developer-toolbar

Developer toolbar shell with built-in monitors (environment, frame jank, memory, console errors), a registry for custom items, a spacing measure tool, and a component inspect tool.

**Portability:** candidate for extraction to Cloud UI. The package has no `@kbn/*` runtime dependencies and builds to a standalone tarball via `packaging/scripts/build.sh`.

## Layout

Each source keeps its original structure under its own folder in `src/`:

- `src/toolbar/` — the toolbar shell and its built-in monitors (`toolbar_items/`).
- `src/measure/` — the measure tool and the `@kbn/design-tools` helpers it needs, at their `@kbn/design-tools` paths. The helpers are copies; see [`src/measure/README.md`](src/measure/README.md).
- `src/inspect/` — the inspect tool (including grab mode), at its `inspect_component/public/` paths, plus the host abstraction that replaces Kibana's HTTP and overlay services (`types.ts`, `host/`).
- `src/react_fiber/` — a copy of `@kbn/react-fiber`, which inspect needs; see [`src/react_fiber/README.md`](src/react_fiber/README.md).
- `src/lib/` — package-only helpers that replace Kibana packages (`platform.ts` for `isMac`).

## Exports

- `DeveloperToolbar` — the toolbar; render once per page. Props are listed [below](#developertoolbar-props).
- `DeveloperToolbarItem` — registers a custom item (`id`, `children`, `priority`) from anywhere in the tree.
- `useToolbarState` — access registered items and enabled/disabled settings.
- `MeasureButton` — toolbar button (`⌘ .` / `Ctrl .`) that toggles a spacing measure overlay; render it inside a `DeveloperToolbarItem`. Prop: `ignoredClassPrefixes` (host chrome class name prefixes the overlay never selects, e.g. `['kbnChromeLayout']` in Kibana; defaults to none).
- `InspectButton` — toolbar button that toggles a component inspect overlay. With `mode="inspect"` (default, `⌘ '` / `Ctrl '`) clicking an element opens a flyout with its React source component, file, codeowners and source links. With `mode="grab"` (`⌘ ⇧ '` / `Ctrl Shift '`) clicking or `⌘ C` / `Ctrl C` copies, and dragging carries, an agent-friendly description of the element and its pruned component stack. Render one button per mode; only one mode is active at a time. Props: `host` (`InspectHostConfig`, required), `mode` and `ignoredClassPrefixes`.
- `createGithubSourceLinks({ repo, branch })` — `InspectHostConfig.getSourceLinks` implementation with GitHub, github.dev, VS Code, WebStorm and Cursor links.
- `createPrefixFileResolver({ repoRoot })` — `InspectHostConfig.resolveFileData` implementation that strips `repoRoot` from the absolute source path client-side (no codeowners).
- Types: `DeveloperToolbarProps`, `DeveloperToolbarItemProps`, `DeveloperToolbarState`, `DeveloperToolbarRegisteredItem`, `EnvironmentInfo`, `MeasureButtonProps`, `InspectButtonProps`, `InspectHostConfig`, `InspectMode`, `InspectFileData`, `InspectSourceLocation`, `InspectSourceLink`, `CreateGithubSourceLinksOptions`, `CreatePrefixFileResolverOptions`.

## DeveloperToolbar props

| Prop | Description | Default |
| --- | --- | --- |
| `envInfo` | Environment details for the environment badge (shape-compatible with Kibana's `PluginInitializerContext.env`). | none (badge hidden) |
| `onHeightChange` | Called with the height the host should reserve (`0` when minimized). | none |
| `disableHint` | Hint in the toggle tooltip explaining how to disable the toolbar. | `Disable the developer toolbar in your app configuration` |
| `iconType` | Environment badge icon in production mode (development mode always shows `wrench`). | `logoKibana` |
| `portal` | Portals the expanded toolbar to `document.body`, fixed to the bottom of the viewport. | `false` |

## Inspect host config

```ts
interface InspectHostConfig {
  resolveFileData: (fileName: string) => Promise<InspectFileData | null>; // { relativePath, baseFileName, codeowners? }
  getSourceLinks: (location: InspectSourceLocation) => InspectSourceLink[]; // { id, label, href, iconType }
  getCodeownerHref?: (codeowner: string) => string | undefined; // plain text when absent
  colorMode?: 'light' | 'dark'; // defaults to the page's EUI color mode (captured by DeveloperToolbar, not the toolbar's dark theme)
}
```

Grab mode calls `resolveFileData` once per activation, on the first hovered element, to derive the repository root (`fileName` minus `relativePath`) that shortens the paths in the copied context; paths stay absolute when it resolves to `null` or rejects. Starting a drag also copies the same context to the clipboard.

Inspect reads React's `_debugSource`, which only exists when JSX is compiled for development (`@babel/preset-react` with `development: true`, React 18). Without it the overlay shows a hint and clicking exits inspect mode. The flyout is rendered by the package as an `EuiFlyout` with `container={null}`, so a host `componentDefaults.EuiFlyout.container` does not capture it.

## Host requirements

- Peer dependencies: `react`, `react-dom`, `@elastic/eui` (`>=113.2.0`, the first release with `EuiFlyout` `container={null}`), `@emotion/react`, `@emotion/css`.
- Render inside an `EuiProvider`.
- Inspect only: a development JSX transform (see above). `dom-to-image-more` (component preview) and a copy of the `@kbn/react-fiber` helpers (`src/react_fiber`) are bundled.
- Reserve space via `onHeightChange`, or pass `portal` to fix the toolbar to the bottom of the viewport.
- State is shared through `globalThis.__KIBANA_DEVELOPER_TOOLBAR_CTX__` and persisted in `kbn_developer_toolbar_*` localStorage keys.

Kibana wiring (mounting, `registerItem` API, Kibana-specific items such as the color theme toggle) lives in the `developerToolbar` plugin (`src/platform/plugins/shared/developer_toolbar`). See [`docs-dev/kbn-ui/developer-toolbar.md`](../../../../docs-dev/kbn-ui/developer-toolbar.md).
