# @kbn/core-chrome-layout-feature-flags

This package provides feature flag utilities for the Chrome layout system in Kibana. It enables toggling and retrieving layout-related feature flags, such as layout type, debug mode, and side navigation version, to support progressive enhancement and experimentation in the UI.

## Exports

- `LAYOUT_FEATURE_FLAG_KEY`: The feature flag key for selecting the layout type (`legacy-fixed` or `grid`).
- `LAYOUT_DEBUG_FEATURE_FLAG_KEY`: The feature flag key for enabling layout debug mode.
- `LAYOUT_PROJECT_SIDENAV_FEATURE_FLAG_KEY`: The feature flag key for selecting the project side navigation version (`v1`, `v2`, or `both`).
- `getLayoutVersion(featureFlags)`: Returns the current layout type.
- `getLayoutDebugFlag(featureFlags)`: Returns whether layout debug mode is enabled.
- `getSideNavVersion(featureFlags)`: Returns the current side navigation version.

## Usage

Import the utilities and use them with a `FeatureFlagsStart` instance:

```ts
import {
  getLayoutVersion,
  getLayoutDebugFlag,
  getSideNavVersion,
} from '@kbn/core-chrome-layout-feature-flags';

const layoutType = getLayoutVersion(featureFlags);
const isDebug = getLayoutDebugFlag(featureFlags);
const sideNavVersion = getSideNavVersion(featureFlags);
```
