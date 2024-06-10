# @kbn/response-ops-feature-flags

This packages exposes a feature flag service that is used in the ResponseOps plugins and packages to handle feature flags.

## Usage

```
const featureFlagService = createFeatureFlagService(['test.myFeature', 'test.myFeature.subFeature']);


if (featureFlagService.isFeatureFlagSet('test.myFeature')) {
  // my feature code
}
```