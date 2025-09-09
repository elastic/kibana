# @kbn/cloud

Cloud integration UI components and utilities for Kibana. This package provides reusable components for displaying cloud deployment information, connection details, and cloud-specific functionality across Kibana interfaces.

## Overview

The `@kbn/cloud` package contains shared UI components and utilities specifically designed for cloud deployments of Kibana. It provides standardized interfaces for displaying connection details, deployment information, and cloud-specific features that enhance the user experience in cloud environments.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/kibana-core`
- **Visibility**: Shared across platform
- **Dependencies**: `@elastic/eui`, `react`
- **Storybook**: Includes component documentation and examples

## Core Components

### Connection Details
Components for displaying and managing cloud connection information:

- `ConnectionDetails` - Main component for showing connection information
- `ConnectionDetailsFlyoutContent` - Flyout content for detailed connection setup
- `ConnectionDetailsOptsProvider` - Context provider for connection configuration

### Deployment Details
Components for displaying cloud deployment metadata and status information.

## Key Features

### Connection Management
- Display connection endpoints and credentials
- Interactive connection setup flows
- Copy-to-clipboard functionality for connection strings
- Validation and error handling for connection parameters

### Cloud Deployment Integration
- Deployment status indicators
- Cloud-specific configuration displays
- Integration with Elastic Cloud services
- Responsive design for various screen sizes

### Context Management
- React context for sharing cloud configuration
- Provider pattern for component composition
- Type-safe configuration options

## Usage Examples

### Connection Details Display
```typescript
import { ConnectionDetails, ConnectionDetailsOptsProvider } from '@kbn/cloud';

function CloudConnectionPanel() {
  const connectionOpts = {
    endpoints: ['https://my-deployment.es.cloud'],
    cloudId: 'my-cloud-id',
    apiKey: 'my-api-key'
  };

  return (
    <ConnectionDetailsOptsProvider value={connectionOpts}>
      <ConnectionDetails />
    </ConnectionDetailsOptsProvider>
  );
}
```

### Connection Details Flyout
```typescript
import { ConnectionDetailsFlyoutContent } from '@kbn/cloud';

function ConnectionSetupFlyout({ isOpen, onClose }) {
  return (
    <EuiFlyout isOpen={isOpen} onClose={onClose}>
      <ConnectionDetailsFlyoutContent
        onConnectionEstablished={handleConnectionSuccess}
        onCancel={onClose}
      />
    </EuiFlyout>
  );
}
```

### Custom Connection Configuration
```typescript
import { ConnectionDetailsOptsProvider } from '@kbn/cloud';
import type { ConnectionDetailsOpts } from '@kbn/cloud';

const customOpts: ConnectionDetailsOpts = {
  showCredentials: true,
  allowCopy: true,
  theme: 'cloud',
  onConnectionTest: async (details) => {
    return await testCloudConnection(details);
  }
};

function CustomCloudSetup() {
  return (
    <ConnectionDetailsOptsProvider value={customOpts}>
      {/* Cloud components */}
    </ConnectionDetailsOptsProvider>
  );
}
```

## Integration Points

### Cloud Plugin Integration
The package is designed to work seamlessly with Kibana's cloud plugin, providing UI components that integrate with cloud-specific APIs and services.

### Monitoring Integration
Components can display connection status and health information from monitoring plugins, providing users with real-time cloud deployment status.

### Data Visualizer Integration
Cloud components integrate with data visualization features, allowing users to analyze their cloud deployment data and connection patterns.

## Component Architecture

### Provider Pattern
Uses React context providers to share cloud configuration and connection state across component trees, ensuring consistent behavior and reducing prop drilling.

### Composition-First Design
Components are designed for composition, allowing developers to build custom cloud interfaces by combining smaller, focused components.

### Storybook Documentation
Comprehensive Storybook stories demonstrate component usage patterns, making it easy for teams to implement cloud features consistently.

## Cloud-Specific Features

### Elastic Cloud Integration
- Direct integration with Elastic Cloud APIs
- Cloud deployment metadata display
- Automated connection string generation
- Cloud service status indicators

### Security and Credentials
- Secure handling of cloud credentials
- Copy-to-clipboard with security considerations
- Credential validation and testing
- Error handling for authentication failures

This package provides the foundation for cloud-related UI functionality across Kibana, ensuring consistent user experience and reducing development effort for cloud feature implementation.
