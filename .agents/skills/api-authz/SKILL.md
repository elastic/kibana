---
name: api-authz
description: Kibana API route authorization patterns. Use when configuring route security, working with requiredPrivileges, using authzResult for privilege-based branching, opting out of authorization, or naming custom privileges.
---

# API Authorization

> All API routes in Kibana must have authorization checks. Authorization is not optional, even for `internal` routes.

## Route Security Configuration

Routes declare authorization via the `security` option in `KibanaRouteOptions`:

```ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      requiredPrivileges: ['<privilege_1>', '<privilege_2>'],
    },
  },
  ...
}, handler);
```

## Privilege Naming

Privilege names follow the `<operation>_<subject>` convention using underscores only.

| Incorrect | Why | Correct |
|-----------|-----|---------|
| `read-entity-a` | Uses `-` instead of `_` | `read_entity_a` |
| `delete_entity-a` | Mixes `_` and `-` | `delete_entity_a` |
| `entity_manage` | Subject before operation | `manage_entity` |

## Privilege-Based Branching with `authzResult`

When a route handler branches logic based on user privileges (returns different data, enables different features), it **must** use `request.authzResult`. Do not use `capabilities.resolveCapabilities()` or other authorization checks for branching — `authzResult` is the single source of truth.

**Look for:** routes with `anyRequired` (OR logic), handlers that conditionally expose data based on permissions, or functions that check capabilities and return booleans for branching.

**Correct — use `authzResult`:**
```ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      requiredPrivileges: ['privilege_3', { anyRequired: ['privilege_1', 'privilege_2'] }],
    },
  },
  ...
}, (context, request, response) => {
  const authzResult = request.authzResult;
  // { "privilege_3": true, "privilege_1": true, "privilege_2": false }

  if (authzResult.privilege_1) {
    return response.ok({ body: ... });
  } else if (authzResult.privilege_2) {
    return response.ok({ body: ... });
  }

  return response.ok({ body: { data: ... } });
});
```

**Wrong — using capabilities for authorization branching:**
```ts
const canReadDecryptedParams = async (routeContext: RouteContext) => {
  const { request, server } = routeContext;
  const capabilities = await server.coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'my_capability.*',
  });
  return capabilities.my_capability?.canReadParams ?? false;
};

if (await canReadDecryptedParams(routeContext)) {
  return getDecryptedParams(routeContext, paramId);
} else {
  return getBasicParams(routeContext, paramId);
}
```

**Fix:** declare both privileges in the route config with `anyRequired` and branch on `request.authzResult`:
```ts
router.get({
  path: '/api/params',
  security: {
    authz: {
      requiredPrivileges: [{ anyRequired: ['read_params_decrypted', 'read_params'] }],
    },
  },
}, (context, request, response) => {
  if (request.authzResult.read_params_decrypted) {
    return getDecryptedParams(routeContext, paramId);
  } else {
    return getBasicParams(routeContext, paramId);
  }
});
```

## Opting Out of Authorization

When a route must opt out, use the predefined `AuthzOptOutReason` enum or `AuthzDisabled` helpers from `@kbn/core-security-server`:

```ts
import { AuthzDisabled, AuthzOptOutReason } from '@kbn/core-security-server';

// Predefined helper
router.get({
  path: '/api/path',
  security: { authz: AuthzDisabled.delegateToSOClient },
  ...
}, handler);

// Predefined enum
router.get({
  path: '/api/path',
  security: {
    authz: { enabled: false, reason: AuthzOptOutReason.DelegateToSOClient },
  },
  ...
}, handler);

// Custom reason — only when no predefined reason applies
router.get({
  path: '/api/health',
  security: {
    authz: {
      enabled: false,
      reason: 'This route is a health check endpoint that returns no sensitive information',
    },
  },
  ...
}, handler);
```

**Invalid opt-out reasons — flag these:**
- `"Opt out from authorization"` — too generic, no context
- `"This route does not need authorization"` — no explanation why
- `"Authorization not required"` — no context provided
- `"Authorization is delegated to SO Client"` — use `AuthzOptOutReason.DelegateToSOClient` instead

## References

- [Kibana API Authorization Documentation](dev_docs/key_concepts/api_authorization.mdx)
- [Kibana HTTP API Design Guidelines](dev_docs/contributing/kibana_http_api_design_guidelines.mdx)
