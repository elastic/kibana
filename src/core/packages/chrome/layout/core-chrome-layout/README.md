# @kbn/core-chrome-layout

Layout service implementations for Kibana's Chrome application shell.

## Usage

```tsx
import { LayoutService } from './layout_service';
import { GridLayout } from './layouts/grid';
import { LegacyFixedLayout } from './layouts/legacy-fixed';

const layout = getLayoutVersion(featureFlags);
const Layout = layout === 'grid' ? new GridLayout(deps) : new LegacyFixedLayout(deps);

ReactDOM.render(<Layout />, targetDomElement);
```

## Available Layouts

- **`grid`**: Modern CSS Grid-based layout (WIP)
- **`legacy-fixed`**: Traditional fixed layout (default)

## Related

- [`@kbn/core-chrome-layout-feature-flags`](../core-chrome-layout-feature-flags) - Feature flag utilities
