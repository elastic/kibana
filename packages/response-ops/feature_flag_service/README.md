# @kbn/response-ops-feature-flags

This packages exposes a feature flag service that is used in the ResponseOps plugins and packages to handle feature flags.

## Usage

### Create feature flag service

```
const featureFlagService = createFeatureFlagService(['test.myFeature', 'test.myFeature.subFeature']); // TS will infer the types automatically 
```

or

```
type FeatureFlagValues = 'test.myFeature' | 'test.myOtherFeature'
const featureFlagService = createFeatureFlagService<FeatureFlagValues>(['test.myFeature']);
```

### Checking the existence of a feature flag
```
const featureFlagService = createFeatureFlagService(['test.myFeature', 'test.myFeature.subFeature']);

if (featureFlagService.isFeatureFlagSet('test.myFeature')) {
  // my feature code
}
```