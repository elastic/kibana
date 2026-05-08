# @kbn/core-chrome-feature-flags

Feature flag utilities for Kibana's Chrome system.

## Chrome Next

`NEXT_CHROME_FEATURE_FLAG_KEY` (`core.chrome.next`) controls the Chrome Next rollout.

Use `isNextChrome(featureFlags)` when core Chrome code needs to branch on the rollout state:

```ts
import { isNextChrome, NEXT_CHROME_FEATURE_FLAG_KEY } from '@kbn/core-chrome-feature-flags';

const nextChromeEnabled = isNextChrome(featureFlags); // boolean
```

`NEXT_CHROME_SESSION_STORAGE_KEY` (`dev.core.chrome.next`) is used by the development toggle
to override the remote feature flag for local testing.
