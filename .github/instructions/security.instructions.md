---
applyTo: "{**/plugins/**/*.ts,**/packages/**/*.ts}"
excludeAgent: "coding-agent"
---

# Security & Authorization Review Guidelines

> **Critical Security Requirement:** All API routes in Kibana must have proper authorization checks. Authorization is not optional, even for `internal` routes.

## Review Style
- Be specific and actionable in feedback
- Explain the "why" behind recommendations
- Acknowledge good patterns when you see them
- Ask clarifying questions when code intent is unclear

## Authorization Configuration

Routes use the `security` configuration in `KibanaRouteOptions`:

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

## Critical Review Checklist

Focus on these three key areas when reviewing API authorization:

###  1. Branching Logic with AuthzResult

**REQUIRED:** If a route handler branches its logic based on user privileges (e.g., returns different data or features), it MUST use `request.authzResult` to check which privileges were granted. Do NOT use `capabilities.resolveCapabilities()` or other authorization checks for branching—`authzResult` is the single source of truth.

**Patterns to search for:**
- Routes with `anyRequired` or complex privilege configurations (OR logic)
- Handlers that return different data or behavior based on user privileges
- Handlers that conditionally expose features or data based on permissions
- Handlers that check `capabilities.resolveCapabilities()` or similar methods for authorization decisions
- Functions that check permissions/privileges and return boolean values used for branching

** Correct Implementation:**
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
  //  CORRECT: Use request.authzResult to check which privileges were granted
  const authzResult = request.authzResult;
  // {
  //   "<privilege_3>": true,
  //   "<privilege_1>": true,
  //   "<privilege_2>": false
  // }

  // Branch logic based on specific privileges
  if (authzResult.privilege_1) {
    // User has privilege_1, return enhanced data
    return response.ok({ body: ...  });
  } else if (authzResult.privilege_2) {
    // User has privilege_2, return basic data
    return response.ok({ body: ...  });
  }

  // Fallback (should not reach here if security config is correct)
  return response.ok({ body: { data: ... } });
});
```

**Flag using Capabilities Instead of AuthzResult:**
```ts
  // WRONG: Using capabilities.resolveCapabilities() for authorization branching
  const canReadDecryptedParams = async (routeContext: RouteContext) => {
    const { request, server } = routeContext;
    
    const capabilities = await server.coreStart.capabilities.resolveCapabilities(request, {
      capabilityPath: 'my_capability.*',
    });
    
    return capabilities.my_capability?.canReadParams ?? false;
  };
  
  // In handler:
  if (await canReadDecryptedParams(routeContext)) {
    return getDecryptedParams(routeContext, paramId);
  } else {
    return getBasicParams(routeContext, paramId);
  }
  
  // CORRECT: Use authzResult instead
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

###  2. Opt-Out Authorization Reason

**When reviewing:** Check all routes with `authz: { enabled: false }` or `AuthzDisabled.*` usage. Verify they use predefined reasons when applicable, or provide specific context.

**If a route opts out of authorization, use predefined `AuthzOptOutReason` enum or `AuthzDisabled` helpers:**

```ts
import { AuthzDisabled, AuthzOptOutReason } from '@kbn/core-security-server';

//  CORRECT: Use predefined reason for Saved Objects client
router.get({
  path: '/api/path',
  security: {
    authz: AuthzDisabled.delegateToSOClient,
  },
  ...
}, handler);

//  CORRECT: Use predefined reason enum
router.get({
  path: '/api/path',
  security: {
    authz: {
      enabled: false,
      reason: AuthzOptOutReason.DelegateToSOClient,
    },
  },
  ...
}, handler);

//  CORRECT: Custom string when no predefined reason applies
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

**Flag if:** `reason` is:
  -`"Opt out from authorization"` (too generic, no context)
  - `"This route does not need authorization"` (no explanation why)
  - `"Authorization not required"` (no context provided)
  - `Authorization is delegated to SO Client` (semantically equivalent to the already predefined reason `AuthzOptOutReason.DelegateToSOClient`)

## Summary

**Key Points for Reviewers:**

1. **Privilege names must follow `<operation>_<subject>` convention**
   - Incorrect privilege names:
     - `read-entity-a`: Uses `-` instead of `_`
     - `delete_entity-a`: Mixes `_` and `-`
     - `entity_manage`: Places the subject name before the operation
   - Correct privilege names:
     - `read_entity_a`
     - `delete_entity_a`
     - `manage_entity`
2. **Routes with privilege-based branching MUST use `request.authzResult`**
3. **Opt-out routes must have clear, specific reasons with context (not just "Opt out from authorization")*

## References

- [Kibana API Authorization Documentation](dev_docs/key_concepts/api_authorization.mdx)
- [Kibana HTTP API Design Guidelines](dev_docs/contributing/kibana_http_api_design_guidelines.mdx)

