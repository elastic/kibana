# @kbn/core-chrome-feature-flags

Feature flag utilities for Kibana's Chrome system.

## Usage

```typescript
import { isNextChrome, NEXT_CHROME_FEATURE_FLAG_KEY } from '@kbn/core-chrome-feature-flags';

const nextChromeEnabled = isNextChrome(featureFlags); // boolean
```

## Feature Flags

- **`NEXT_CHROME_FEATURE_FLAG_KEY`** (`core.chrome.next`): Enables the next-generation Chrome UI
