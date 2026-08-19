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

## Design Exploration (POC)

`DESIGN_EXPLORATION_FEATURE_FLAG_KEY` (`core.chrome.designExploration`) enables a throwaway
global style override layer for local design iteration. Not intended for merge.

Enable in `kibana.dev.yml` alongside Chrome Next:

```yaml
feature_flags.overrides:
  core.chrome.next: true
  core.chrome.designExploration: true
```

Use `isDesignExploration(featureFlags)` to branch on the flag. Styles are scoped via
`body[data-design-exploration='true']` and `body[data-design-exploration-variant='{id}']`
(see `DesignExplorationChromeGlobalStyles` in `@kbn/ui-chrome-layout`).

Variant selection is stored in sessionStorage (`DESIGN_EXPLORATION_VARIANT_SESSION_KEY`) and
switched from the dev toolbar. Helpers: `getDesignExplorationVariant()`,
`setDesignExplorationVariant(id)`. Variant ids are listed in `DESIGN_EXPLORATION_VARIANT_OPTIONS`
(keep in sync with `@kbn/ui-chrome-layout` variant files).

For app-specific overrides, add a plugin-level `<Global>` component scoped to the same body
attribute:

```tsx
import { Global, css } from '@emotion/react';
import { DESIGN_EXPLORATION_BODY_ATTR } from '@kbn/ui-chrome-layout';

const scope = `body[${DESIGN_EXPLORATION_BODY_ATTR}='true']`;

export const AppHeaderDesignExplorationStyles = () => (
  <Global
    styles={css`
      ${scope} [data-test-subj='kbnAppHeader'] {
        /* padding overrides */
      }
    `}
  />
);
```
