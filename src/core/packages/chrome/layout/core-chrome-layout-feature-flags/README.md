# @kbn/core-chrome-layout-feature-flags

Feature flag utilities for Kibana's Chrome layout system.

## Usage

```typescript
import { getLayoutDebugFlag } from '@kbn/core-chrome-layout-feature-flags';

const isDebug = getLayoutDebugFlag(featureFlags); // boolean
```

## Feature Flags

- **`LAYOUT_DEBUG_FEATURE_FLAG_KEY`** (`core.chrome.layoutDebug`): Debug mode toggle for layout visualization

## Configuration

To enable debug mode, set in your Kibana config:

```yaml
core.chrome.layoutDebug: true
```

## Functions

See the implementation file for complete API documentation and usage details.
