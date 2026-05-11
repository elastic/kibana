# @kbn/core-chrome-feature-flags

Feature flag utilities for Kibana's Chrome system.

## Chrome Next

`NEXT_CHROME_FEATURE_FLAG_KEY` (`core.chrome.next`) controls the Chrome Next rollout.
The flag defaults to `false`, so the foundation code is inert unless the flag is enabled.

Use `isNextChrome(featureFlags)` when core Chrome code needs to branch on the rollout state:

```ts
import { isNextChrome } from '@kbn/core-chrome-feature-flags';

const nextChromeEnabled = isNextChrome(featureFlags);
```
