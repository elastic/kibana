# Feedback Responses - Connector Spec 2.0

## Response to Comment 1 & 2: `subFeature` and `getKibanaPrivileges`

**Your Comment:**
> "With us moving the 'actions' out of the connectors, I think we can drop this. We added this when we were still putting the actions themselves in the connectors and the actions were 'dangerous' and should be used in limited situations."

**Response:**
✅ **Agreed and removed.** Since Connectors 2.0 moves actions to a separate framework with its own privilege management, these connector-level fields are no longer needed. 

**Changes Made:**
- Removed `subFeature?: "endpointSecurity"` from `ConnectorMetadata`
- Removed `getKibanaPrivileges?: (args) => string[]` from `ConnectorMetadata`
- Privilege management will be handled at the action level in the new framework

---

## Response to Comment 3: Input Validation Responsibility

**Your Question:**
> "Who is responsible for input validation: the user who calls the action, or should it always be part of the handler?"

**Response:**
The **framework is responsible**, not the handler. Here's how it works:

### Design Principle
```typescript
actions: {
  myAction: {
    input: z.object({
      apiKey: z.string().min(10)
    }),
    handler: async (ctx, input) => {
      // input is already validated here!
      // handler should NEVER validate
      // if validation failed, handler isn't called
    }
  }
}
```

### Flow
1. **User calls action** with parameters
2. **Framework validates** against `input` Zod schema
3. **If valid** → handler called with typed, validated input
4. **If invalid** → handler never called, validation error returned

### Empty Input
`z.object({})` is perfectly valid for actions that take no parameters:

```typescript
test: {
  input: z.object({}),  // ✅ Valid - action takes no params
  handler: async (ctx) => {
    // Test connection, return status
  }
}
```

### Custom Validation
Additional validation goes **in the schema using Zod refinements**, not in the handler:

```typescript
input: z.object({
  url: z.string().url().refine(
    async (url) => await isReachable(url),
    { message: "URL not reachable" }
  )
})
```

**Summary:** Handler receives pre-validated, type-safe input. Never validate in handlers.

---

## Response to Comment 4: Custom Validators vs Pure Zod

**Your Comment:**
> "Having this kind of abstraction on top of zod will defeat the purpose, and make it harder for us to generate OAS. [...] Since both approaches have the same OAS limitation, we should optimize for simplicity, standard patterns, and future flexibility."

**Response:**
✅ **100% agreed. You're absolutely right.** Custom validator functions are an anti-pattern here. We've removed them entirely and migrated to pure Zod.

### What We Removed
```typescript
// ❌ REMOVED - Anti-pattern
validateConfig?: (config: unknown, services: unknown) => void | string | null;
validateSecrets?: (secrets: unknown, services: unknown) => void | string | null;
validateConnector?: (config: unknown, secrets: unknown) => string | null;
```

### What We Use Instead

#### 1. URL Allowlist Validation
**Shared Zod refinement** instead of custom validator:

```typescript
// Shared utility (reusable across connectors)
export const createUrlAllowlistRefine = (
  configurationUtilities: ConfigurationUtilities
) => {
  return (url: string) => {
    try {
      configurationUtilities.ensureUriAllowed(url);
      return true;
    } catch {
      return false;
    }
  };
};

// In connector schema
configSchema: z.object({
  apiUrl: z.string().url().refine(
    createUrlAllowlistRefine(configurationUtilities),
    { message: "URL not in allowlist" }
  )
})
```

#### 2. Complex Business Logic (Cross-field Validation)
**Zod's `superRefine`** handles this:

```typescript
configSchema: z.object({
  provider: z.enum(['openai', 'azure', 'other']),
  apiKey: z.string().optional(),
  azureEndpoint: z.string().optional()
}).superRefine((config, ctx) => {
  // Azure requires endpoint
  if (config.provider === 'azure' && !config.azureEndpoint) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['azureEndpoint'],
      message: "Azure endpoint required when using Azure provider"
    });
  }
  // Other provider requires API key
  if (config.provider === 'other' && !config.apiKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['apiKey'],
      message: "API key required for custom provider"
    });
  }
})
```

#### 3. External/Async Validation (API Connectivity)
**Zod supports async refinement**:

```typescript
configSchema: z.object({
  apiUrl: z.string().url(),
  apiKey: z.string()
}).refine(
  async (config) => {
    try {
      await testConnection(config.apiUrl, config.apiKey);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Cannot connect to API endpoint - check URL and credentials" }
)
```

#### 4. Secrets Interdependencies
**Zod's `superRefine` for secret validation**:

```typescript
secretsSchema: z.object({
  certificateData: z.string().optional(),
  privateKeyData: z.string().optional()
}).superRefine((secrets, ctx) => {
  const hasCert = !!secrets.certificateData;
  const hasKey = !!secrets.privateKeyData;
  
  // Both or neither
  if (hasCert !== hasKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasCert ? ['privateKeyData'] : ['certificateData'],
      message: "Certificate and private key must both be provided for mTLS"
    });
  }
})
```

### Final ValidationConfig

```typescript
export interface ValidationConfig {
  /** Config schema with Zod refinements for validation */
  configSchema: z.ZodSchema;
  
  /** Secrets schema with Zod refinements for validation */
  secretsSchema: z.ZodSchema;
  
  /** 
   * URL fields that need allowlist validation
   * Framework enforces this separately for security
   */
  validateUrls?: {
    configFields?: string[];
    secretFields?: string[];
  };
}
```

### Benefits

✅ **Simplicity** - One validation approach (Zod), not two  
✅ **Standard patterns** - Developers know Zod already  
✅ **Better TypeScript inference** - Zod schemas provide types  
✅ **Reusable utilities** - Share refinements across connectors  
✅ **Future flexibility** - Zod ecosystem improvements benefit us automatically  
✅ **No mental overhead** - Don't need to choose between Zod vs custom validators  

### OAS Limitations

You're correct that `refine`/`superRefine` don't translate to OpenAPI schemas. But:
- This is a **Zod limitation**, not our choice
- Custom validators **also** don't translate to OAS
- At least with Zod we get all the ecosystem benefits
- OAS can still describe the base schema structure
- Complex validation rules can be documented separately

**If OAS support becomes critical**, we can add a code generator that extracts validation rules from Zod refinements and adds them as OpenAPI extensions or descriptions.

### Migration Path

All existing connectors using custom validators can migrate to Zod refinements:

**Before:**
```typescript
validation: {
  configSchema: z.object({ url: z.string() }),
  validateConfig: (config, services) => {
    services.configurationUtilities.ensureUriAllowed(config.url);
  }
}
```

**After:**
```typescript
validation: {
  configSchema: z.object({
    url: z.string().url().refine(
      createUrlAllowlistRefine(services.configurationUtilities),
      { message: "URL not in allowlist" }
    )
  })
}
```

---

## Summary of All Changes

### Removed from Spec
1. ❌ `subFeature` field (privilege management moved to action level)
2. ❌ `getKibanaPrivileges` function (privilege management moved to action level)
3. ❌ `validateConfig` function (use Zod `.refine()` instead)
4. ❌ `validateSecrets` function (use Zod `.superRefine()` instead)
5. ❌ `validateConnector` function (use Zod `.superRefine()` instead)

### Kept/Updated
1. ✅ `configSchema` - now with Zod refinements
2. ✅ `secretsSchema` - now with Zod refinements
3. ✅ `validateUrls` - for framework-level allowlist enforcement

### Documentation Added
- Examples of shared Zod refinements
- Examples of `superRefine` for cross-field validation
- Examples of async validation with Zod
- Migration guide from custom validators to Zod

---

**Thank you for the excellent feedback!** These changes make the spec significantly simpler, more maintainable, and better aligned with standard patterns.

