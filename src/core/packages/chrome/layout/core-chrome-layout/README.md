# @kbn/core-chrome-layout

Layout service implementations for Kibana's Chrome application shell.

## Usage

```tsx
import { LayoutService } from './layout_service';
import { GridLayout } from './layouts/grid';
import { getLayoutDebugFlag } from '@kbn/core-chrome-layout-feature-flags';

const debugLayout = getLayoutDebugFlag(featureFlags);
const layout = new GridLayout(deps, { debug: debugLayout });

ReactDOM.render(<Layout />, targetDomElement);
```

## Available Layouts

- **`grid`**: Modern CSS Grid-based layout

## Debug Mode

Set `core.chrome.layoutDebug: true` in your Kibana config to enable debug overlays for layout visualization.

## Related

- [`@kbn/core-chrome-layout-feature-flags`](../core-chrome-layout-feature-flags) - Feature flag utilities for debug mode
- [Layout overview](../layout_overview.mdx) - Architecture and data flow
