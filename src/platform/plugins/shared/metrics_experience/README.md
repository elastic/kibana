# Metrics Experience

Exposes the services, components, and API endpoints required for the Metrics Experience in Discover.

## Feature Flags 

See the [Feature flag service](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service#dynamic-config) documentation for details on how to use feature flags.

Set constants for feature flag keys in [common/constants.ts](./common/constants.ts).

These are the feature flags used by Metrics Experience:
*  `metricsExperienceEnabled`: Enabled Metrics Experience profile in Discover and APIs