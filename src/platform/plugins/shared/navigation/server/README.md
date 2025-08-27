# Navigation Plugin - Server

## Overview

The server-side portion of the Navigation plugin is primarily responsible for registering UI settings that control navigation behavior across Kibana. While most of the navigation functionality is implemented on the client side, the server component provides essential configuration options and defaults.

## Features

### UI Settings

The server plugin registers several UI settings that control navigation behavior:

- **`hideWriteControls`**: Controls the visibility of write operation controls in the UI
- **`defaultRoute`**: Defines the default route for Kibana when a user first logs in
- **`autoRefreshInterval`**: Sets the default auto-refresh interval for dashboards and visualizations
- **`timepicker:quickRanges`**: Configures the quick time ranges available in the time picker

These settings can be customized by administrators through the Advanced Settings UI or via configuration files.

### Plugin Setup

During the setup phase, the server plugin:

1. Registers all navigation-related UI settings with their default values
2. Sets up any server-side APIs needed by the client plugin

## Integration Points

The server plugin integrates with:

- **Core UI Settings**: To register and manage navigation configuration
- **Core HTTP Routes**: To expose any necessary API endpoints

## Usage

Most developers will not need to interact directly with the server plugin. The UI settings registered by this plugin are consumed by the client-side components automatically.

If you need to access these settings programmatically on the server side:

```typescript
import { UI_SETTINGS } from '@kbn/shared-navigation-plugin/common';

// In a route handler or service
const hideWriteControls = await coreStart.uiSettings.get(UI_SETTINGS.HIDE_WRITE_CONTROLS);
```