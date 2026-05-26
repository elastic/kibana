# @kbn/app-header

React APIs for rendering and registering Kibana app headers during the Chrome Next migration.

Chrome Next moves app header rendering toward one shared visual system while allowing two placement
models:

- App-owned inline rendering, where the page renders `AppHeader` in its own React tree.
- Chrome-owned top-bar rendering, where the app registers an `AppHeaderConfig` and Chrome renders it
  in the layout's `applicationTopBar` slot.

The inline model is the preferred destination. Chrome-owned registration is a transitional path for
apps whose existing layout makes inline placement risky or expensive.

## Which API should I use?

Use `AppHeader` when the page can render its header inline in the app's React tree. This is the preferred long-term model for pages that own their title, back target, tabs, badges, and app menu locally. `AppHeaderWithFallback` also handles the classic `EuiPageHeader` fallback when Chrome Next is disabled.

Use `ChromeAppHeaderRegistration` for app/plugin React integration when Chrome should own the top-bar slot. This is the right transitional API for pages like Dashboard and Discover, where Chrome-owned placement keeps the migration small while still using the shared `AppHeaderView` rendering stack.

Use `useChromeAppHeaderRegistration` for lower-level custom wrappers that need to compose registration with other hooks. Most apps should prefer `ChromeAppHeaderRegistration` over calling this hook directly.

Use `chrome.next.appHeader.set` as the core imperative primitive behind React adapters. It is not the preferred app-facing React API.

## Chrome Next flag and runtime checks

Chrome Next is gated by the feature flag key `core.chrome.next`, exported as
`NEXT_CHROME_FEATURE_FLAG_KEY` from `@kbn/core-chrome-feature-flags`.

Chrome layout code should use `isNextChrome(featureFlags)` from `@kbn/core-chrome-feature-flags` to
decide which layout slots are active.

App-facing React code usually does not need to read the flag directly. Use the `@kbn/app-header`
components and hooks so the package can handle runtime behavior consistently. Internally,
`ChromeAppHeaderRegistration` only registers when Chrome Next is enabled and the active chrome style
is project:

```ts
chrome.next.isEnabled && chrome.getChromeStyle() === 'project';
```

When this condition is false, registration is a no-op and the existing classic/project Chrome paths
continue to own the header area.

## Migration guidance

Migrate route-by-route, not necessarily app-by-app. Different routes in the same plugin can use
different buckets while the migration is in progress:

| Bucket | Preferred API | When to use |
|---|---|---|
| Inline-ready | `AppHeader` | The page can colocate header state with its React tree and can use the built-in classic fallback. |
| Chrome-driven transitional | `ChromeAppHeaderRegistration` | Chrome should own the top-bar slot, usually because the route still has sticky or shared top-nav layout constraints. |
| Fallback-only audit | Legacy Chrome state | Temporary safety net for routes that have not explicitly migrated yet. Plan an inline or transitional migration before relying on this long term. |

### Fallback-only audit

Chrome Next in project layout does not render the classic breadcrumbs UI. For unmigrated routes,
Chrome can still render a minimal app header as a fallback by deriving:

- A back button from the closest usable breadcrumb.
- A menu from `chrome.setAppMenu()` or a legacy `chrome.setHeaderActionMenu()` mount point.
- Badges from legacy badge state when fallback header content is already present.

This is only a compatibility fallback, not a migration target. If the route's breadcrumbs are
missing, stale, or point to the wrong parent, the fallback back button will inherit the same problem.
Routes in this bucket should be audited and moved to explicit `AppHeader` or
`ChromeAppHeaderRegistration` configuration.

## Examples

```tsx
import { ChromeAppHeaderRegistration } from '@kbn/app-header';

export const ExampleHeaderRegistration = ({ title, menu }) => (
  <ChromeAppHeaderRegistration title={title} menu={menu} />
);
```

```tsx
import { useMemo } from 'react';
import { useChromeAppHeaderRegistration } from '@kbn/app-header';

export const useExampleHeaderRegistration = ({ title, menu }) => {
  const config = useMemo(() => ({ title, menu }), [title, menu]);

  useChromeAppHeaderRegistration(config);
};
```

```tsx
import { isNextChrome } from '@kbn/core-chrome-feature-flags';

const nextChromeEnabled = isNextChrome(featureFlags);
```
