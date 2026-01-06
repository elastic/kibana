# @kbn/core-chrome-layout

Layout service implementations for Kibana's Chrome application shell.

## Usage

```tsx
import { GridLayout } from './layouts/grid';

const layout = new GridLayout(deps);
const Layout = layout.getComponent();

ReactDOM.render(<Layout />, targetDomElement);
```

## Available Layouts

- **`grid`**: Modern CSS Grid-based layout

## Related

- [`@kbn/core-chrome-layout-feature-flags`](../core-chrome-layout-feature-flags) - Feature flag utilities
