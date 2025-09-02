# @kbn/background-search

## Summary

A small shared package that exposes helpers and a UI callout for Kibana's background search.

## Exports

- BackgroundSearchCallout: React component
  - Renders a small callout when a restored/background-loading session is active (respecting the feature flag).
- getBackgroundSearchState$(): Observable<SearchSessionState> | undefined
  - Getter for the wired session state observable.
- initBackgroundSearch(params: { state$: Observable<SearchSessionState>, enabled: boolean })
  - Wire runtime dependencies (feature flag + session state observable) from a plugin.
- isBackgroundSearchEnabled(): boolean
  - Returns the wired feature-flag value.

## Usage

1. Wire the package from your plugin's `start()`:

```ts
import { initBackgroundSearch } from '@kbn/background-search';

public start(core: CoreStart, { data }: { data: DataPublicPluginStart }) {
  const enabled = core.featureFlags?.getBooleanValue?.('search.backgroundSearchEnabled') ?? false;

  initBackgroundSearch({
    enabled,
    state$: data.search.session.state$,
  });
}
```

2. Use the callout in any UI code:

```tsx
import { BackgroundSearchCallout } from '@kbn/background-search';

function MyComponent() {
  return (
    <div>
      <BackgroundSearchCallout />
      {/* other UI */}
    </div>
  );
}
```

## Feature flag

The feature flag key used by convention is:
`search.backgroundSearchEnabled`

```yaml
feature_flags.overrides.search.backgroundSearchEnabled: true
```
