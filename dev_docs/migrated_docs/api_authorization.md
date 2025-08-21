---
id: kibDevDocsSecurityAPIAuthorization
slug: /kibana-dev-docs/key-concepts/security-api-authorization
title: Kibana API authorization
description: This guide provides an overview of API authorization in Kibana.
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'security']
---

Authorization is essential for all API endpoints, including those marked as `internal`. This guide covers how to apply authorization to your endpoints.

## Default behavior

**Kibana API routes have no authorization by default.** APIs are accessible to anyone with valid credentials, including users with no roles.

When authorization is needed:
- API is not a simple CRUD interface to Saved Objects
- Route bypasses built-in Saved Objects authorization
- **Critical scenarios** requiring authorization:
  1. Heavy processing (loads Elasticsearch cluster/Kibana server)
  2. Uses internal `kibana_system` user for Elasticsearch calls
  3. Calls third-party services
  4. Exposes non-public information (config, state, error details)

> [!NOTE]
> [Saved Objects](/kibana-dev-docs/key-concepts/saved-objects-intro) Service includes authorization checks. If your API is primarily Saved Objects CRUD, authorization may already be covered. This applies to Alerting and Cases services as well.

## Security configuration

Use `security` config in `KibanaRouteOptions` for both Classic and Versioned routes:

```ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      requiredPrivileges: ['manage_alerts', 'read_dashboard'],
    },
  },
}, handler);
```

### Key features
- **Fine-grained control**: Specify exact privileges required
- **Complex rules**: AND (`allRequired`) and OR (`anyRequired`) logic
- **Version-specific**: Different security per API version
- **Auto-documentation**: OpenAPI specs include privilege requirements
- **Handler access**: `AuthzResult` object available in route handlers

## Privilege naming

**Pattern**: `{operation}_{subject}`

**Valid operations**: `manage`, `read`, `update`, `delete`, `create`

**Examples:**
```ts
// ✅ Correct
'read_dashboard'
'delete_alert'  
'manage_user'

// ❌ Incorrect
'read-dashboard'    // Uses dash
'dashboard_read'    // Wrong order
'delete_alert-rule' // Mixed separators
```

Use `ApiPrivileges` utility:
```ts
ApiPrivileges.manage('alerts')  // → 'manage_alerts'
ApiPrivileges.read('dashboard') // → 'read_dashboard'
```

## Special privileges

**Operator privileges** (requires additional privilege):
```ts
security: {
  authz: {
    requiredPrivileges: [ReservedPrivilegesSet.operator, 'manage_system'],
  },
}
```

**Superuser privileges**:
```ts
security: {
  authz: {
    requiredPrivileges: [ReservedPrivilegesSet.superuser],
  },
}
```

## Authorization rules

**All required (AND logic)**:
```ts
requiredPrivileges: ['read_alerts', 'read_dashboard'] // Both needed
```

**Any required (OR logic)**:
```ts
requiredPrivileges: [{ anyRequired: ['admin', 'superuser'] }] // Either works
```

**Complex nested rules**:
```ts
// (admin OR superuser) AND manage_alerts
requiredPrivileges: [
  { anyRequired: ['admin', 'superuser'] },
  'manage_alerts'
]

// (read_alerts AND read_cases) OR (admin AND manage_system)  
requiredPrivileges: [{
  anyRequired: [
    { allOf: ['read_alerts', 'read_cases'] },
    { allOf: ['admin', 'manage_system'] }
  ]
}]
```

## Versioned routes

Different versions can have different security requirements:

```ts
router.versioned
  .get({
    path: '/internal/alerts',
    access: 'internal',
    security: {
      authz: {
        requiredPrivileges: ['read_alerts'], // Default for all versions
      },
    },
  })
  .addVersion({
    version: '1',
    validate: false,
    security: {
      authz: {
        requiredPrivileges: ['read_alerts', 'read_cases'], // V1 needs both
      },
    },
  }, handlerV1)
  .addVersion({
    version: '2',
    validate: false,
    // Inherits default: only needs 'read_alerts'
  }, handlerV2);
```

## Route handler access

Access authorization results in handlers:

```ts
router.get({
  path: '/api/alerts',
  security: {
    authz: {
      requiredPrivileges: ['read_alerts', { anyRequired: ['admin', 'viewer'] }],
    },
  },
}, (context, request, response) => {
  // Available in request.authzResult:
  // {
  //   "read_alerts": true,
  //   "admin": true, 
  //   "viewer": false
  // }
  
  const hasAdminAccess = request.authzResult?.admin;
  // Use authorization info for conditional logic
});
```

## Opting out

**Before (no authorization)**:
```ts
router.get({ path: '/api/path' }, handler);
```

**After (explicit opt-out)**:
```ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      enabled: false,
      reason: 'Public health check endpoint with no sensitive data',
    },
  },
}, handler);
```

## OpenAPI documentation

Security requirements automatically appear in OpenAPI specs:

```bash
GET /api/oas?pathStartsWith=/api/alerts
```

Generated docs show required privileges for each endpoint.

## Questions?

Contact `@elastic/kibana-security` team for authorization help.