# @kbn/one-navigation

Standalone build of the Kibana side navigation component for use in non-Kibana
Elastic applications (e.g. Cloud console).

## How it works

The source component lives in `src/core/packages/chrome/navigation/`. This
packaging layer bundles it into a single JS file with webpack, replacing
Kibana-only dependencies (`@kbn/i18n`, `@kbn/core-chrome-layout-constants`)
with lightweight stubs via aliases.

## Quick start

```bash
# From the Kibana root
yarn kbn bootstrap
./scripts/build_one_navigation.sh
```

Artifacts are written to `src/core/packages/chrome/navigation/target/`.

## Usage

```tsx
import { OneNavigation } from '@kbn/one-navigation';

<OneNavigation
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
