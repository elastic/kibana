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

`NEXT_CHROME_SESSION_STORAGE_KEY` (`dev.core.chrome.next`) is used by the development toolbar
toggle. The session override is only read after `core.chrome.next` is enabled, so it can disable
Chrome Next locally during development but cannot enable Chrome Next when the rollout flag is off.

## Agent-first chrome (POC)

`AGENT_FIRST_FEATURE_FLAG_KEY` (`core.chrome.agentFirst`) controls the agent-first layout POC.
The flag defaults to `false`. The agent workspace only renders when **Chrome Next** is also enabled
(project chrome with `core.chrome.next`).

Enable in local dev via `feature_flags.overrides` in `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  core.chrome.next: true
  core.chrome.agentFirst: true
```

Use `isAgentFirst(featureFlags)` when core Chrome code needs to branch on the rollout state:

```ts
import { isAgentFirst } from '@kbn/core-chrome-feature-flags';

const agentFirstEnabled = isAgentFirst(featureFlags);
```
