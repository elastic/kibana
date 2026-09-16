# deepagent Knowledge Base: Security Review

## Overview

Security accounts for approximately 4% of deepagent's feedback (~20+ items across ~400 PRs). His security review focuses on license validation, access control, input sanitization, and multi-tenant isolation. Security issues are among the most likely to be flagged as blockers.

---

## License Validation

### Check Status AND Level

**PR #237009 - License status check must be active (BLOCKER)**

When checking license level, you must also verify that the license is active. A license can be the correct level (e.g., "enterprise") but expired, which should deny access.

```typescript
// BAD - BLOCKER: only checks level
if (license.hasAtLeast('enterprise')) {
  enableAgentBuilder();
}

// GOOD: checks both level and status
if (license.hasAtLeast('enterprise') && license.isActive) {
  enableAgentBuilder();
}
```

**Why this matters:**
- Trial licenses expire after a fixed period
- Customers may let licenses lapse
- Feature access should be revoked when the license expires
- Checking only level creates a security hole where expired licenses still grant access

### Where to Check

License checks should be performed at:
- **Route level**: Before processing API requests
- **Plugin setup/start**: To determine which features to enable
- **UI level**: To show/hide features in the interface

All three levels should check. The server-side check is the authoritative one; the UI check is for user experience.

---

## Tool Prefix Spoofing

### Reserved Prefix Enforcement

**PR #240893 - Tool prefix spoofing prevention (BLOCKER)**

In the Agent Builder, tool names use prefixes to indicate their origin (e.g., `mcp.` for MCP protocol tools). User-defined tools must not be allowed to use reserved prefixes.

**Attack vector:**
1. Attacker creates a custom tool named `mcp.dangerous_tool`
2. The system treats it as an MCP protocol tool
3. The tool gets elevated trust/permissions intended for MCP tools
4. Attacker code runs with higher privileges

**Mitigation:**
```typescript
const RESERVED_PREFIXES = ['mcp.', 'system.', 'builtin.'];

function validateToolName(name: string): void {
  for (const prefix of RESERVED_PREFIXES) {
    if (name.startsWith(prefix)) {
      throw new Error(
        `Tool name "${name}" uses reserved prefix "${prefix}". ` +
        'User-defined tools cannot use reserved prefixes.'
      );
    }
  }
}
```

**Rule:** Server-side validation must reject tool names with reserved prefixes. This check must be on the server, not just the client.

---

## Space Isolation

### Multi-Tenant Data Boundaries

**PR #245299 - Space isolation concerns (WARNING)**

Kibana uses Spaces for multi-tenancy. Each space is an isolated tenant with its own:
- Saved objects
- Dashboards
- Visualizations
- Agent Builder configurations

**Rules:**
- All saved object operations must use space-aware clients
- Queries must filter by space ID
- Cross-space data access must be explicitly authorized
- API handlers must verify the request's space context

```typescript
// BAD - ignores space context
const tools = await savedObjectsClient.find({
  type: 'agent-builder-tool',
});

// GOOD - space-aware (savedObjectsClient is already scoped to the request's space)
const tools = await savedObjectsClient.find({
  type: 'agent-builder-tool',
  // The client is already scoped to the current space
  // but be explicit about not querying across spaces
});
```

**Space-aware utilities:**
```typescript
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';

// Build space-scoped paths
const path = addSpaceIdToPath('/app/agent_builder', spaceId);
```

---

## Service Passing Patterns

### Pass Services, Not Results

**PR #237009 - Pass services not results (WARNING)**

When a function needs access to external data, pass the service (or scoped client) that can fetch the data, not the pre-fetched result.

```typescript
// BAD - pre-fetches and passes result
const license = await licensing.getLicense();
await processRequest(request, license);
// processRequest can't re-check the license or get updated info

// GOOD - passes the service
await processRequest(request, licensing);
// processRequest can check exactly what it needs, when it needs it
```

**Why this matters for security:**
- The function can make its own authorization decisions
- The service may enforce per-request security context
- Pre-fetched results may be stale by the time they're used
- Passing services follows the principle of least privilege more precisely

---

## Input Validation

### Server-Side Validation

All user inputs must be validated on the server side. Client-side validation is for UX only and can be bypassed.

**Rules:**
- Validate all route parameters, query strings, and request bodies
- Use Kibana's schema validation in route definitions
- Validate types, ranges, and formats
- Reject unexpected fields (or at minimum, strip them)

```typescript
router.post(
  {
    path: '/api/agent_builder/tools',
    validate: {
      body: schema.object({
        name: schema.string({
          minLength: 1,
          maxLength: 100,
          validate: (value) => {
            if (RESERVED_PREFIXES.some(p => value.startsWith(p))) {
              return 'Tool name uses a reserved prefix';
            }
          },
        }),
        description: schema.string({ minLength: 1, maxLength: 1000 }),
        schema: schema.object({}, { unknowns: 'allow' }),
      }),
    },
  },
  handler
);
```

### URL Validation

**PR #252140 - Use http.externalUrl.isInternalUrl (WARNING)**

When validating URLs (e.g., redirect URLs, callback URLs), use Kibana's built-in utility rather than custom validation:

```typescript
// BAD - custom URL validation
function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

// GOOD - platform utility handles edge cases
const isInternal = http.externalUrl.isInternalUrl(url);
```

---

## RBAC (Role-Based Access Control)

### Feature Privilege Checks

Agent Builder features should be gated by Kibana's RBAC system:

```typescript
// In plugin setup
features.registerKibanaFeature({
  id: 'agentBuilder',
  name: 'Agent Builder',
  privileges: {
    all: {
      api: ['agent_builder_write'],
      savedObject: { all: ['agent-builder-tool'], read: [] },
      ui: ['show', 'create', 'edit', 'delete'],
    },
    read: {
      api: ['agent_builder_read'],
      savedObject: { all: [], read: ['agent-builder-tool'] },
      ui: ['show'],
    },
  },
});
```

### API Authorization

Route handlers should verify the user has the required privileges:

```typescript
router.post(
  {
    path: '/api/agent_builder/tools',
    security: {
      authz: {
        requiredPrivileges: ['agent_builder_write'],
      },
    },
  },
  async (context, request, response) => {
    // Handler is only reached if user has agent_builder_write privilege
  }
);
```

---

## LLM-Specific Security

### Prompt Injection Prevention

While not explicitly flagged in the reviewed PRs, deepagent's emphasis on centralized system prompts and input validation aligns with prompt injection prevention:

- System prompts assembled in one place are easier to audit for injection vulnerabilities
- User inputs passed to LLMs should be clearly delimited from system instructions
- Tool call parameters should be validated before execution

### Tool Execution Security

Tools that execute user-provided or LLM-generated code must have:
- Sandboxing (no access to file system, network, or secrets)
- Timeout limits (prevent infinite loops)
- Resource limits (memory, CPU)
- Output size limits (prevent memory exhaustion)

---

## Common Anti-patterns

### 1. License Level Without Status Check
Already covered. Always check `isActive`.

### 2. Missing Server-Side Validation
Already covered. Client validation is insufficient.

### 3. Tool Name Spoofing
Already covered. Validate against reserved prefixes.

### 4. Cross-Space Data Leakage
Already covered. Use space-aware clients.

### 5. Pre-Fetching Security Context
Already covered. Pass services, not results.

### 6. Custom URL Validation
Already covered. Use platform utilities.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| License check missing isActive | BLOCKER |
| Tool prefix spoofing possible | BLOCKER |
| Cross-space data leakage | WARNING |
| Missing server-side validation | WARNING |
| Custom URL validation | WARNING |
| Pass results instead of services | WARNING |
| Missing RBAC checks | WARNING |
