# @kbn/core-chrome-layout-feature-flags

Feature flag utilities for Kibana's Chrome layout system.

## Usage

```typescript
import {
  getLayoutVersion,
  getLayoutDebugFlag,
  getSideNavVersion,
} from '@kbn/core-chrome-layout-feature-flags';

const layoutType = getLayoutVersion(featureFlags); // 'legacy-fixed' | 'grid'
const isDebug = getLayoutDebugFlag(featureFlags); // boolean
const sideNavVersion = getSideNavVersion(featureFlags); // 'v1' | 'v2' | 'both'
```

## Feature Flags

- **`LAYOUT_FEATURE_FLAG_KEY`**: Layout type selection
- **`LAYOUT_DEBUG_FEATURE_FLAG_KEY`**: Debug mode toggle
- **`LAYOUT_PROJECT_SIDENAV_FEATURE_FLAG_KEY`**: Side navigation version

## Functions

See the implementation file for complete API documentation and usage details.
