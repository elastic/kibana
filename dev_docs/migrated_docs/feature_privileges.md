---
id: kibDevFeaturePrivileges
slug: /kibana-dev-docs/key-concepts/designing-feature-privileges
title: Creating Feature Privileges
description: Learn to control access to features of your plugin
date: 2025-08-21
tags: ['kibana', 'dev', 'architecture', 'contributor']
---

Feature Privileges provide granular role-based access control (RBAC) for your plugin, letting administrators control who can access features and what actions they can perform.

## Quick setup

**1. Add features dependency:**
```json
// kibana.jsonc
{
  "requiredPlugins": ["features"]
}
```

**2. Register your feature:**
```ts
const PLUGIN_ID = 'myPlugin';
features.registerKibanaFeature({
  id: PLUGIN_ID,
  name: 'My Plugin',
  category: DEFAULT_APP_CATEGORIES.management,
  app: ['myApp'],
  privileges: {
    all: {
      app: ['myApp'],
      ui: ['view', 'create', 'edit', 'delete'],
      api: ['my_secure_api']
    },
    read: {
      app: ['myApp'], 
      ui: ['view']
    }
  }
});
```

## UI access control

**Define capabilities in registration:**
```ts
privileges: {
  all: {
    ui: ['view', 'create', 'edit', 'delete', 'assign']
  },
  read: {
    ui: ['view'] // Read-only users can only view
  }
}
```

**Check capabilities in React components:**
```tsx
export const MyComponent: React.FC = () => {
  const kibana = useKibana<CoreStart>();
  const capabilities = kibana.services.application!.capabilities[PLUGIN_ID];
  
  return (
    <div>
      {capabilities.create && (
        <EuiButton onClick={handleCreate}>Create</EuiButton>
      )}
      {capabilities.delete && (
        <EuiButton color="danger" onClick={handleDelete}>Delete</EuiButton>
      )}
    </div>
  );
};
```

## API access control

**Secure API routes:**
```ts
router.get({
  path: '/internal/my-plugin/sensitive-data',
  validate: false,
  security: {
    authz: {
      requiredPrivileges: ['my_secure_api']
    }
  }
}, handler);
```

**Grant API access in privileges:**
```ts
privileges: {
  all: {
    api: ['my_secure_api'] // Users with 'all' privilege can access this API
  },
  read: {
    api: [] // Read-only users cannot access secure APIs
  }
}
```

> [!NOTE]
> For comprehensive API authorization patterns, see [API Authorization](/kibana-dev-docs/key-concepts/security-api-authorization).

## Configuration options

### Core feature config

```ts
interface KibanaFeatureConfig {
  id: string;                    // Unique feature identifier
  name: string;                  // Display name (use i18n)
  category: AppCategory;         // Groups features in management UI
  app: string[];                 // App IDs enabled by this feature
  
  // Optional
  description?: string;          // Subtitle in management UI
  order?: number;               // Sort order
  minimumLicense?: LicenseType; // UI display only, doesn't restrict access
  excludeFromBasePrivileges?: boolean;
}
```

### Privilege configuration

```ts
interface FeatureKibanaPrivileges {
  // Access control
  app?: string[];              // Client-side applications
  api?: string[];              // Server-side API endpoints  
  ui?: string[];               // UI capabilities
  
  // Resource access
  savedObject?: {
    all?: string[];            // Full access to saved object types
    read?: string[];           // Read-only access
  };
  
  // Integration privileges  
  alerting?: {
    rule?: { all?: string[]; read?: string[]; };
    alert?: { all?: string[]; read?: string[]; };
  };
  cases?: {
    all?: string[];
    create?: string[];
    read?: string[];
    update?: string[];
    delete?: string[];
  };
  
  // UI sections
  management?: {
    [sectionId: string]: string[]; // Management page access
  };
  catalogue?: string[];        // Catalogue entry visibility
}
```

## Advanced patterns

**Sub-features for granular control:**
```ts
subFeatures: [{
  id: 'advanced_settings',
  name: 'Advanced Settings',
  privilegeGroups: [{
    groupType: 'independent',
    privileges: [{
      id: 'advanced_config',
      name: 'Configure Advanced Settings',
      includeIn: 'all',
      ui: ['advanced_config'],
      api: ['advanced_api']
    }]
  }]
}]
```

**Spaces integration:**
```ts
privileges: {
  all: {
    requireAllSpaces: true  // Feature requires access to all spaces
  }
}
```

**License-based features:**
```ts
{
  minimumLicense: 'gold',  // Shows in UI only for Gold+ licenses
  // Note: This doesn't enforce license checks - implement separately
}
```

## Best practices

- **Use descriptive IDs**: Feature and privilege IDs appear in role configurations
- **Group related capabilities**: Don't create separate privileges for every minor action  
- **Test privilege combinations**: Verify `all` + `read` + sub-feature combinations work correctly
- **Document custom privileges**: If using non-standard privilege names, document their purpose
- **Consider migration**: Plan for privilege changes across Kibana versions

## Resources

- **Example plugin**: [Feature control examples](https://github.com/elastic/kibana/tree/main/examples/feature_control)
- **Security guide**: [API Authorization](/kibana-dev-docs/key-concepts/security-api-authorization)
- **Role management**: Available in Stack Management > Security > Roles