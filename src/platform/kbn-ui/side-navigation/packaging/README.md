# @kbn/ui-side-navigation

Standalone build of the Kibana side navigation component for use in non-Kibana
Elastic applications (e.g. Cloud console).

## How it works

The source component lives in `src/platform/kbn-ui/side-navigation/`. This
packaging layer bundles it into a single JS file with webpack, replacing
Kibana-only dependencies (`@kbn/i18n`, `@kbn/core-chrome-layout-constants`)
with lightweight stubs via aliases.

## Quick start

```bash
yarn kbn bootstrap
src/platform/kbn-ui/side-navigation/packaging/scripts/build.sh
```

Artifacts are written to `src/platform/kbn-ui/side-navigation/target/`.

## Usage

```tsx
import { SideNavigation } from '@kbn/ui-side-navigation';

<SideNavigation
  items={navigationItems}
  logo={logoConfig}
  isCollapsed={false}
  activeItemId="dashboard"
  onItemClick={handleClick}
  onToggleCollapsed={handleToggle}
  setWidth={setWidth}
/>
```

### Peer dependencies

| Package | Version |
|---------|---------|
| `@elastic/eui` | >= 112 |
| `@emotion/css` | >= 11 |
| `@emotion/react` | >= 11 |
| `react` | >= 18 |
| `react-dom` | >= 18 |

## Further reading

- [Build details](./BUILD.md)
- [i18n approach](./I18N.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Source component README](../README.md)
