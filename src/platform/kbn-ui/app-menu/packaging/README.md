# @kbn/ui-app-menu

Standalone build of Kibana's app menu (the action bar in the app header) for
use in non-Kibana Elastic applications (e.g. Cloud UI, design prototypes), so
they can use the real component instead of re-creating it.

## How it works

The source components live in `src/platform/kbn-ui/app-menu/`. This packaging
layer bundles them into a single JS file with webpack:

- `@kbn/i18n` is replaced with a lightweight stub via aliases.
- `@kbn/ui-chrome-layout` is bundled from its prebuilt standalone target
  (`src/platform/kbn-ui/chrome-layout/target/`), which the build script
  creates if it's missing.
- `lodash` is bundled. EUI, Emotion and React stay external.

The publish pipeline (`.buildkite/scripts/steps/kbn_ui_publish.sh`) runs the
build on merge to `main` whenever this package changes and publishes the
tarball to the internal Artifactory registry.

## Quick start

```bash
pnpm kbn bootstrap
src/platform/kbn-ui/app-menu/packaging/scripts/build.sh
```

Artifacts are written to `src/platform/kbn-ui/app-menu/target/`.

## Usage

Render the menu inside an `EuiProvider`.

```tsx
import { AppMenuComponent, type AppMenuConfig } from '@kbn/ui-app-menu';

const config: AppMenuConfig = {
  items: [
    { id: 'share', label: 'Share', iconType: 'share', run: () => openShare() },
  ],
  primaryActionItem: { id: 'save', label: 'Save', iconType: 'save', run: () => save() },
};

<AppMenuComponent config={config} breakpointSource="viewport" />
```

Outside Kibana's Chrome layout there is no application width to measure, so
the menu falls back to viewport breakpoints. Passing
`breakpointSource="viewport"` makes that explicit.

The package exports the same public API as the Kibana package, including
`AppMenuLoading`, the lower-level menu components, constants, test subjects
and helpers. See the [source README](../README.md) for responsive behavior,
the loading skeleton and the strict-props contract.

### Peer dependencies

| Package | Version |
|---------|---------|
| `@elastic/eui` | >= 112 |
| `@emotion/react` | >= 11.14 |
| `react` | >= 18 |
| `react-dom` | >= 18 |

## Further reading

- [Build details](./BUILD.md)
- [i18n approach](./I18N.md)
- [Source component README](../README.md)
