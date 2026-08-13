# @kbn/core-chrome-feature-flags

Feature flag utilities for Kibana's Chrome system.

## Chrome Next

`NEXT_CHROME_FEATURE_FLAG_KEY` (`core.chrome.next`) controls the Chrome Next rollout.
The flag defaults to `true`.

The flag only controls the rollout state; Chrome Next renders in the project layout. Code that
replaces or hides fallback UI must check both conditions:

```ts
import { isNextChrome } from '@kbn/core-chrome-feature-flags';

const isNextProjectChrome = chromeStyle === 'project' && isNextChrome(featureFlags);
```

Use `isNextChrome(featureFlags)` alone only when the layout distinction is irrelevant, such as
registering additive Chrome Next content while preserving the existing Chrome path.

`NEXT_CHROME_SESSION_STORAGE_KEY` (`dev.core.chrome.next`) is used by the development toolbar
toggle. The session override is only read after `core.chrome.next` is enabled, so it can disable
Chrome Next locally during development but cannot enable Chrome Next when the rollout flag is off.
