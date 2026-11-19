---
navigation_title: Developer toolbar
---

# @kbn/ui-developer-toolbar [kbn-ui-developer-toolbar]

The developer toolbar is a dev-only bar pinned to the bottom of the page. It shows environment details and built-in monitors (frame jank, memory usage, console errors), and hosts custom items registered from anywhere in the app. The package is self-contained so it can be distributed to external consumers (for example, Cloud UI) alongside {{kib}} itself.

In {{kib}}, the `developerToolbar` plugin (`src/platform/plugins/shared/developer_toolbar`) mounts the toolbar and exposes the `registerItem` API. Apps should use that API rather than importing this package directly.

## Components

It exposes the following:

* `DeveloperToolbar` — the toolbar shell with the built-in monitors. Render it once per page.
* `DeveloperToolbarItem` — registers a custom item. It renders nothing in place; its children appear in the toolbar.
* `useToolbarState` — reads the registered items and the enabled/disabled settings.
* `MeasureButton` — a toolbar button that toggles the spacing measure overlay.
* `InspectButton` — a toolbar button that toggles the component inspect or grab overlay.
* `createGithubSourceLinks` and `createPrefixFileResolver` — helpers that build an `InspectHostConfig`.

### Toolbar [kbn-ui-developer-toolbar-toolbar]

The toolbar can be minimized to a floating button (`Ctrl+\` / `⌘+\`) and hidden with a right click. The built-in monitors can be toggled from the settings modal.

:::{storybook}
:id: kibana:kbn_ui:developer-toolbar--default
:::

### Custom items [kbn-ui-developer-toolbar-items]

`DeveloperToolbarItem` takes an `id`, `children`, and an optional `priority` (higher numbers appear first).

:::{storybook}
:id: kibana:kbn_ui:developer-toolbar--extensible
:::

### Measure [kbn-ui-developer-toolbar-measure]

`MeasureButton` toggles a measure overlay (`Ctrl+.` / `⌘+.`). Click an element to anchor it, then hover another element to see the distance between them; spacing that matches an EUI size token is labelled with the token name. Press `Escape` to exit. Render it inside a `DeveloperToolbarItem`; the Extensible story above includes it.

The overlay always skips the toolbar itself (`#developerToolbar`), the `@kbn/design-tools` overlays, EUI spacers, and anything marked with `data-devtool-ignore`. Pass `ignoredClassPrefixes` to also skip host chrome elements whose class names contain one of the given prefixes. {{kib}} passes `['kbnChromeLayout']`; it defaults to none.

```tsx
<DeveloperToolbarItem id="Measure Component">
  <MeasureButton ignoredClassPrefixes={['myAppChrome']} />
</DeveloperToolbarItem>
```

### Inspect [kbn-ui-developer-toolbar-inspect]

`InspectButton` toggles an inspect overlay (`Ctrl+'` / `⌘+'`). Hover an element to see its closest React source component, then click it to open a flyout with a preview, the component name, codeowners, its EUI component and icon, and links to open the source file. Press `Escape`, or click the overlay mask outside the flyout, to close it. The overlay never highlights the toolbar itself (nor what it covers), its own highlight, or SVG paths; pass `ignoredClassPrefixes` to also skip host chrome elements whose class names contain one of the given prefixes.

Pass `mode="grab"` for a second button that toggles grab mode (`Ctrl+Shift+'` / `⌘+Shift+'`). It highlights elements like inspect mode, but the highlight becomes a drag handle: drag it into a coding agent's chat or a terminal to drop an agent-friendly description as plain text, or click it, or press `Ctrl+C` / `⌘+C` while an element is highlighted, to copy the same description to the clipboard (starting a drag copies it too). Grab mode stays active until it is toggled off, `Escape` is pressed, or you click somewhere with nothing inspectable. Only one mode is active at a time, turning one on turns the other off:

```
<button class="euiButton" type="button" data-test-subj="saveButton">Save</button>
  in SaveButton (src/platform/plugins/shared/foo/public/components/save_button.tsx:42:7)
  in FooPanel (src/platform/plugins/shared/foo/public/components/foo_panel.tsx:118:5)
```

The first line is the grabbed element without its children (its text content is kept). Each `in` line pairs a component with the location of the JSX it renders, closest first. The stack is pruned to what an agent can act on: wrapper frames (anonymous components, providers, boundaries, higher order components) are dropped except for the closest frame, consecutive frames of the same file or component are collapsed, and beyond the three closest frames only the frames where the stack crosses into another module are kept. Paths are shortened with the repository root derived from the first `resolveFileData` result, and stay absolute when it returns `null`. In both modes the developer toolbar, including the dialogs it renders through portals, keeps working and is never highlighted.

The host decides how files are resolved and which links are shown through the required `host` prop:

| Field | Description |
| --- | --- |
| `resolveFileData(fileName)` | Resolves the absolute `_debugSource.fileName` to `{ relativePath, baseFileName, codeowners? }`, or `null` when unknown. A rejected promise is treated as `null`. |
| `getSourceLinks(location)` | Returns the links shown in the flyout (`{ id, label, href, iconType }`) for `{ fileName, relativePath, lineNumber, columnNumber }`. |
| `getCodeownerHref(codeowner)` | Optional. Link for a codeowner; codeowners render as plain text without it. |
| `colorMode` | Optional `'light'` or `'dark'` for the flyout. Defaults to the EUI color mode of the page `DeveloperToolbar` is rendered in (not the toolbar's own dark theme), so it follows live theme switches. |

`createGithubSourceLinks({ repo, branch })` builds GitHub, github.dev, VS Code, WebStorm and Cursor links, and `createPrefixFileResolver({ repoRoot })` resolves files by stripping the repository root client-side (no codeowners):

```tsx
const inspectHost = {
  resolveFileData: createPrefixFileResolver({ repoRoot: '/Users/me/repos/my-app/' }),
  getSourceLinks: createGithubSourceLinks({ repo: 'elastic/my-app', branch: 'main' }),
};

<DeveloperToolbarItem id="Inspect Component">
  <InspectButton host={inspectHost} ignoredClassPrefixes={['myAppChrome']} />
</DeveloperToolbarItem>
<DeveloperToolbarItem id="Grab Component">
  <InspectButton host={inspectHost} mode="grab" ignoredClassPrefixes={['myAppChrome']} />
</DeveloperToolbarItem>
```

In {{kib}}, the `inspectComponent` plugin registers both items in development mode only. It resolves files through `POST /internal/inspect_component/inspect`, which also returns the codeowners from `.github/CODEOWNERS`.

:::{note}
Inspect relies on React's `_debugSource`, which is only attached when JSX is compiled with the development transform (`@babel/preset-react` with `development: true`, or `@babel/plugin-transform-react-jsx-source`) on React 18. React 19 no longer provides it. Without it, the overlay shows a hint instead of a highlight, and clicking an element exits inspect mode.
:::

The flyout is rendered by the package as an `EuiFlyout` with `container={null}`, so it covers the viewport even when the host sets `componentDefaults.EuiFlyout.container`. It is themed with a nested `EuiThemeProvider` and stacks above the inspect overlay.

### Host labels [kbn-ui-developer-toolbar-labels]

Hosts without {{kib}} build metadata can pass `labels` in `envInfo`; they are listed in the environment tooltip.

:::{storybook}
:id: kibana:kbn_ui:developer-toolbar--with-labels
:::

## Usage [kbn-ui-developer-toolbar-usage]

```tsx
import {
  DeveloperToolbar,
  DeveloperToolbarItem,
  InspectButton,
  MeasureButton,
  createGithubSourceLinks,
  createPrefixFileResolver,
} from '@kbn/ui-developer-toolbar';

const inspectHost = {
  resolveFileData: createPrefixFileResolver({ repoRoot: REPO_ROOT }),
  getSourceLinks: createGithubSourceLinks({ repo: 'elastic/my-app', branch: 'main' }),
};

<>
  <DeveloperToolbarItem id="myItem">
    <MyItem />
  </DeveloperToolbarItem>
  <DeveloperToolbarItem id="Measure Component">
    <MeasureButton />
  </DeveloperToolbarItem>
  <DeveloperToolbarItem id="Inspect Component">
    <InspectButton host={inspectHost} />
  </DeveloperToolbarItem>
  <DeveloperToolbar envInfo={envInfo} onHeightChange={setFooterHeight} />
</>;
```

| Prop | Description |
| --- | --- |
| `envInfo` | Environment details for the environment badge. Shape-compatible with {{kib}}'s `PluginInitializerContext.env`; every `packageInfo` field is optional, and `labels` adds host-specific entries. |
| `onHeightChange` | Called with the height the host should reserve (`0` when minimized). It is not called when the toolbar is hidden. |
| `disableHint` | Hint shown in the toggle tooltip explaining how to disable the toolbar. Defaults to `Disable the developer toolbar in your app configuration`. |
| `iconType` | Environment badge icon in production mode. Defaults to `logoKibana`. |
| `portal` | Portals the expanded toolbar to `document.body`, fixed to the bottom of the viewport, for hosts without a footer slot. Defaults to `false`. |

Settings and items are shared across bundles through `globalThis.__KIBANA_DEVELOPER_TOOLBAR_CTX__`, and settings persist in `kbn_developer_toolbar_*` `localStorage` keys.

## Development [kbn-ui-developer-toolbar-development]

See [Development](index.md#kbn-ui-development) for how to run the shared Storybook and preview these docs. Run this package's tests with:

```bash
pnpm test:jest src/platform/kbn-ui/developer-toolbar
```

Build the standalone tarball with:

```bash
bash src/platform/kbn-ui/developer-toolbar/packaging/scripts/build.sh
```
