# @kbn/core-chrome-layout

The `core-chrome-layout` package provides implementations for different chrome layouts. Each implementation is a layout service that provides a layout component. A layout service is used by the rendering service to render the layout based on the selected layout type.

## Layouts

- `grid`: Grid-based layout (WIP)
- `legacy-fixed`: Legacy fixed layout (default)

## Usage

Import the layout service or components as needed:

```tsx
import { LayoutService } from './layout_service';
import { GridLayout } from './layouts/grid';
import { LegacyFixedLayout } from './layouts/legacy-fixed';
import {
  getLayoutVersion,
  LAYOUT_FEATURE_FLAG_KEY,
  LayoutFeatureFlag,
} from '@kbn/core-chrome-layout-feature-flags';

const layout = getLayoutVersion(featureFlags);
const Layout = layout === 'grid' ? new GridLayout(deps) : new LegacyFixedLayout(deps);

ReactDOM.render(
  <KibanaRootContextProvider {...startServices} globalStyles={true}>
    <Layout />
  </KibanaRootContextProvider>,
  targetDomElement
);
```
