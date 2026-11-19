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

### Host labels [kbn-ui-developer-toolbar-labels]

Hosts without {{kib}} build metadata can pass `labels` in `envInfo`; they are listed in the environment tooltip.

:::{storybook}
:id: kibana:kbn_ui:developer-toolbar--with-labels
:::

## Usage [kbn-ui-developer-toolbar-usage]

```tsx
import { DeveloperToolbar, DeveloperToolbarItem, MeasureButton } from '@kbn/ui-developer-toolbar';

<>
  <DeveloperToolbarItem id="myItem">
    <MyItem />
  </DeveloperToolbarItem>
  <DeveloperToolbarItem id="Measure Component">
    <MeasureButton />
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
