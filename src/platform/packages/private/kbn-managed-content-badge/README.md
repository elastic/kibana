# @kbn/managed-content-badge

UI badge component for identifying managed content in Kibana interfaces. This package provides a standardized badge component that indicates when content is managed by external systems or automated processes.

## Overview

The `@kbn/managed-content-badge` package provides a simple utility function for creating consistent "Managed" badges across Kibana interfaces. These badges help users identify content that is automatically managed, imported, or controlled by external systems.

## Package Details

- **Package Type**: `private` (platform internal)
- **Visibility**: Private to platform packages
- **Dependencies**: `@kbn/i18n`, `@elastic/eui`, `@kbn/navigation-plugin`

## Core Function

### getManagedContentBadge()
Creates a standardized managed content badge for use in navigation and content areas.

#### Parameters
- `tooltipText: string` - Custom tooltip text explaining what "managed" means for this content
- `disableTooltipProps?: boolean` - Optional flag to disable tooltip functionality

#### Returns
`TopNavMenuBadgeProps` - Badge configuration object for navigation menus

## Usage Examples

### Basic Managed Badge
```typescript
import { getManagedContentBadge } from '@kbn/managed-content-badge';

const managedBadge = getManagedContentBadge(
  'This dashboard is automatically managed by Fleet and cannot be edited manually.'
);

// Use in navigation
<TopNavMenu
  badges={[managedBadge]}
  // ... other props
/>
```

### Without Tooltip
```typescript
const simpleBadge = getManagedContentBadge(
  'Managed content description',
  false // Disable tooltip
);
```

### In Different Contexts
```typescript
// For dashboards
const dashboardBadge = getManagedContentBadge(
  'This dashboard is managed by the Fleet integration and updates automatically.'
);

// For data views
const dataViewBadge = getManagedContentBadge(
  'This data view is managed by the integration and should not be modified.'
);

// For saved objects
const savedObjectBadge = getManagedContentBadge(
  'This saved object is managed by an external system.'
);
```

## Badge Properties

### Visual Characteristics
- **Badge Text**: "Managed" (localized)
- **Color**: Primary theme color
- **Icon**: Glasses icon (indicating oversight/management)
- **Position**: Typically displayed in top navigation

### Accessibility Features
- **Data Test Subject**: `managedContentBadge` for testing
- **Title Attribute**: Screen reader accessible title
- **Tooltip**: Configurable tooltip with detailed explanation
- **Keyboard Navigation**: Full keyboard accessibility through EUI components

## Internationalization

The badge text is fully internationalized using Kibana's i18n system:

```typescript
badgeText: i18n.translate('managedContentBadge.text', {
  defaultMessage: 'Managed',
})
```

## Integration Patterns

### Navigation Plugin
```typescript
import { getManagedContentBadge } from '@kbn/managed-content-badge';

function MyManagedView() {
  const badges = [
    getManagedContentBadge(
      'This view is automatically managed by the monitoring system.'
    )
  ];
  
  return (
    <TopNavMenu
      appName="My App"
      badges={badges}
      // ... other navigation props
    />
  );
}
```

### Conditional Badge Display
```typescript
function ContentHeader({ isManaged, managementSource }) {
  const badges = [];
  
  if (isManaged) {
    badges.push(getManagedContentBadge(
      `This content is managed by ${managementSource} and updates automatically.`
    ));
  }
  
  return <Navigation badges={badges} />;
}
```

## Use Cases

### Fleet-Managed Content
Dashboards, data views, and configurations automatically deployed and managed by Fleet integrations.

### Integration-Managed Objects
Saved objects and configurations that are created and maintained by specific integrations or external systems.

### Auto-Generated Content
Automatically generated visualizations, dashboards, or data views that should not be manually modified.

### System-Managed Resources
Resources managed by Kibana itself or other system components where manual intervention could cause issues.

This package provides a consistent way to communicate to users when content is under external management, helping prevent confusion and accidental modifications to automatically managed resources.
