# @kbn/core-pricing-server-internal

## Overview

The `@kbn/core-pricing-server-internal` package provides a service for managing pricing tiers and feature availability in Kibana. It allows you to define different product tiers (e.g., "essentials" vs "complete") and control which features are available in each tier.

This package is part of Kibana's core and is designed to be consumed by other plugins that need to check if certain features should be available based on the current pricing tier configuration.

## Key Components

### PricingService

The main service that handles the initialization, configuration, and management of pricing tiers. It provides methods for registering product features and checking feature availability.

### PricingTiersClient

A client that allows plugins to check if a specific feature is available based on the current pricing tier configuration.

### ProductFeaturesRegistry

A registry that stores information about which features are available in which product tiers.

## Configuration

The pricing service is configured through the `pricing` configuration path in Kibana's configuration. The configuration schema is defined as follows:

```typescript
export const pricingConfig = {
  path: 'pricing',
  schema: schema.object({
    tiers: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      products: schema.maybe(schema.arrayOf(pricingProductsSchema)),
    }),
  }),
};
```

Where `pricingProductsSchema` defines the available products and tiers:

```typescript
export const pricingProductsSchema = schema.oneOf([
  schema.object({
    name: schema.literal('observability'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('essentials')]),
  }),
  // More available products defined by any solution
]);
```

## Usage

### Consuming the PricingService in a Plugin

To use the pricing service in your plugin, you can consume it directly from the provided `core` dependencies.

Here's an example of how to consume the pricing service in a plugin:

```typescript
// my-plugin/server/plugin.ts
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  public setup(core: CoreSetup) {
    // Register features that your plugin provides

    core.pricing.registerProductFeatures([
      {
        id: 'my-plugin:feature1',
        description: 'A feature for observability products',
        products: [
          { name: 'observability', tier: 'complete' },
        ],
      },
      {
        id: 'my-plugin:feature2',
        description: 'A feature for security products',
        products: [
          { name: 'security', tier: 'essentials' },
        ],
      },
    ]);

    /**
     * Checks if a specific feature is available in the current pricing tier configuration.
     * Resolves asynchronously after the pricing service has been set up and all the plugins have registered their features.
     */
    core.pricing.isFeatureAvailable('my-plugin:feature1').then((isActiveObservabilityComplete) => {
      if (isActiveObservabilityComplete) {
        // Enable feature1
      }
    });
  }

  public start(core: CoreStart) {
    // Check if a feature is available based on the current pricing tier
    const isFeature1Available = core.pricing.isFeatureAvailable('my-plugin:feature1');
    const isFeature2Available = core.pricing.isFeatureAvailable('my-plugin:feature2');
    
    // Conditionally enable features based on availability
    if (isFeature1Available) {
      // Enable feature1
    }
    
    if (isFeature2Available) {
      // Enable feature2
    }
  }
}
```

### API Endpoints

The pricing service exposes an internal API endpoint that returns the current pricing tiers configuration and registered product features:

```
GET /internal/core/pricing
```

Response format:

```json
{
  "tiers": {
    "enabled": true,
    "products": [
      { "name": "observability", "tier": "complete" },
      { "name": "security", "tier": "essentials" }
    ]
  },
  "product_features": {
    "my-plugin:feature1": {
      "id": "my-plugin:feature1",
      "products": [
        { "name": "observability", "tier": "complete" },
      ]
    },
    "my-plugin:feature2": {
      "id": "my-plugin:feature2",
      "products": [
        { "name": "observability", "tier": "essentials" },
      ]
    }
  }
}
```

## Best Practices

1. **Feature IDs**: Use a consistent naming convention for feature IDs, such as `pluginId:featureName`.

2. **Granular Features**: Define features at a granular level to allow for fine-grained control over which features are available in which tiers.

3. **Feature Documentation**: Document which features are available in which tiers to help users understand the differences between tiers.

## Testing

When testing your plugin with the pricing service, you can use the `@kbn/core-pricing-server-mocks` package to mock the pricing service:

```typescript
import { pricingServiceMock } from '@kbn/core-pricing-server-mocks';

describe('My Plugin', () => {
  let pricingSetup: ReturnType<typeof pricingServiceMock.createSetupContract>;
  let pricingStart: ReturnType<typeof pricingServiceMock.createStartContract>;
  
  beforeEach(() => {
    pricingSetup = pricingServiceMock.createSetupContract();
    pricingStart = pricingServiceMock.createStartContract();
    
    // Mock feature availability
    pricingStart.isFeatureAvailable.mockImplementation((featureId) => {
      if (featureId === 'my-plugin:feature1') {
        return true;
      }
      if (featureId === 'my-plugin:feature2') {
        return false;
      }
      return false;
    });
  });
  
  it('should enable feature1 when available', () => {
    // Test your plugin with the mocked pricing service
  });
});
```

## Related Packages

- `@kbn/core-pricing-common`: Contains common types and interfaces used by both server and browser packages.
- `@kbn/core-pricing-server`: The public API for the pricing service that plugins can consume.
- `@kbn/core-pricing-browser`: The browser-side counterpart to the pricing service.
- `@kbn/core-pricing-server-mocks`: Mocks for testing plugins that consume the pricing service.
