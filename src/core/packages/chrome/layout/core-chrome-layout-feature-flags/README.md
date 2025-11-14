# @kbn/core-chrome-layout-feature-flags

Feature flag utilities for Kibana's Chrome layout system.

## Usage

```typescript
import { getLayoutVersion, getLayoutDebugFlag } from '@kbn/core-chrome-layout-feature-flags';

const layoutType = getLayoutVersion(featureFlags); // 'legacy-fixed' | 'grid'
const isDebug = getLayoutDebugFlag(featureFlags); // boolean
```

## Feature Flags

- **`LAYOUT_FEATURE_FLAG_KEY`**: Layout type selection
- **`LAYOUT_DEBUG_FEATURE_FLAG_KEY`**: Debug mode toggle

## Functions

See the implementation file for complete API documentation and usage details.
