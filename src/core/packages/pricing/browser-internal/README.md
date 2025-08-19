# @kbn/core-pricing-browser-internal

## Overview

The `@kbn/core-pricing-browser-internal` package provides the browser-side implementation of Kibana's pricing service. It allows client-side code to check if features are available based on the current pricing tier configuration.

This package is part of Kibana's core and is designed to be consumed by other plugins that need to conditionally render UI elements or enable/disable functionality based on the pricing tier.

## Key Components

### PricingService

The main service that handles fetching pricing configuration from the server and providing a client to check feature availability.

### PricingTiersClient

A client that allows plugins to check if a specific feature is available based on the current pricing tier configuration.

## How It Works

The browser-side pricing service works by:

1. Fetching the pricing configuration from the server via an API call to `/internal/core/pricing`
2. Creating a `PricingTiersClient` instance with the fetched configuration
3. Providing the client to plugins through the core start contract

Plugins can then use the client to check if specific features are available based on the current pricing tier configuration.

## Usage

### Consuming the PricingService in a Plugin

To use the pricing service in your plugin, you can consume it directly from the provided `core` dependencies.

Here's an example of how to consume the pricing service in a plugin:

```typescript
// my-plugin/public/plugin.ts
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export class MyPlugin implements Plugin {
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

### Using in React Components

To use the pricing service in React components, you'll typically want to access it through the CoreStart provided to a plugin.

#### Using with CoreStart

```tsx
// my-plugin/public/application.tsx
import React from 'react';
import { CoreStart } from '@kbn/core/public';

interface MyComponentProps {
  coreStart: CoreStart;
}

const MyComponent: React.FC<MyComponentProps> = ({ coreStart }) => {
  const isFeatureAvailable = coreStart.pricing.isFeatureAvailable('my-plugin:feature1');
  
  return (
    <div>
      {isFeatureAvailable ? (
        <div>This feature is available in your current pricing tier!</div>
      ) : (
        <div>This feature requires an upgrade to access.</div>
      )}
    </div>
  );
};
```

## Testing

When testing components that use the pricing service, you can use the `@kbn/core-pricing-browser-mocks` package to mock the pricing service:

```typescript
import { pricingServiceMock } from '@kbn/core-pricing-browser-mocks';
import { render } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MyComponent } from './my_component';

describe('MyComponent', () => {
  let pricingStart: ReturnType<typeof pricingServiceMock.createStartContract>;
  
  beforeEach(() => {
    pricingStart = pricingServiceMock.createStartContract();
    
    // Mock feature availability
    pricingStart.isFeatureAvailable.mockImplementation((featureId) => {
      if (featureId === 'my-plugin:feature1') {
        return true;
      }
      return false;
    });
  });
  
  it('renders feature1 when available', () => {
    const { getByText } = render(
      // The Kibana context provides the services in the react tree, but it's not necessarily required if the services are provided by other means
      <KibanaContextProvider services={{ pricing: pricingStart }}>
        <MyComponent />
      </KibanaContextProvider>
    );
    
    expect(getByText('Use Feature 1')).toBeInTheDocument();
  });
});
```

## Related Packages

- `@kbn/core-pricing-common`: Contains common types and interfaces used by both server and browser packages.
- `@kbn/core-pricing-browser`: The public API for the pricing service that plugins can consume.
- `@kbn/core-pricing-server`: The server-side counterpart to the pricing service.
- `@kbn/core-pricing-browser-mocks`: Mocks for testing plugins that consume the pricing service.
