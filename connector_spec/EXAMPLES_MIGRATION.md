# Examples Migration Summary

All connector examples have been updated to align with the Connectors 2.0 spec changes.

## Files Updated

### 1. ✅ `jira.ts`
**Changed:** Converted `validateConfig` to Zod refinement

**Before:**
```typescript
validation: {
  configSchema: z.object({
    apiUrl: UISchemas.url().describe("Jira URL"),
    projectKey: z.string().optional()
  }),
  validateConfig: (config: any) => {
    if (!config.apiUrl.includes("atlassian.net") && !config.apiUrl.includes("jira")) {
      return "Jira URL must be a valid Jira instance";
    }
    return null;
  }
}
```

**After:**
```typescript
validation: {
  configSchema: z.object({
    apiUrl: UISchemas.url()
      .describe("Jira URL")
      .refine(
        (url) => url.includes("atlassian.net") || url.includes("jira"),
        { message: "Jira URL must be a valid Jira instance (e.g., *.atlassian.net or contain 'jira')" }
      ),
    projectKey: z.string().optional()
  }),
  validateUrls: {
    configFields: ["apiUrl"]
  }
}
```

**Why:** URL validation is now a Zod refinement, making it work seamlessly with your team's dynamic form generation approach.

---

### 2. ✅ `openai.ts`
**Changed:** Removed placeholder `validateConfig`, added `validateUrls`

**Before:**
```typescript
validation: {
  configSchema: z.object({ /* ... */ }),
  validateConfig: (config, services) => {
    // Check if URL is in allowed list
    return null;
  }
}
```

**After:**
```typescript
validation: {
  configSchema: z.object({ /* ... */ }),
  validateUrls: {
    configFields: [], // Auth URLs validated separately
  }
}
```

**Why:** URL allowlist validation is framework-enforced. OpenAI's apiUrl is in the auth schema, not config.

---

### 3. ✅ `bedrock.ts`
**Changed:** Converted `validateConfig` to Zod refinement

**Before:**
```typescript
validation: {
  configSchema: z.object({
    apiUrl: UISchemas.url().describe("API URL"),
    // ...
  }),
  validateConfig: (config: any, services) => {
    if (!config.apiUrl.includes("bedrock-runtime")) {
      return "API URL must be a valid Bedrock endpoint";
    }
    return null;
  }
}
```

**After:**
```typescript
validation: {
  configSchema: z.object({
    apiUrl: UISchemas.url()
      .describe("API URL")
      .refine(
        (url) => url.includes("bedrock-runtime"),
        { message: "API URL must be a valid Bedrock endpoint (must contain 'bedrock-runtime')" }
      ),
    // ...
  }),
  validateUrls: {
    configFields: ["apiUrl"]
  }
}
```

**Why:** Bedrock endpoint validation is now a Zod refinement with clear error message.

---

## Other Examples (No Changes Needed)

- ✅ `slack_api.ts` - Already using pure Zod, no custom validators
- ✅ `webhook.ts` - Already using pure Zod, no custom validators
- ✅ `d3security.ts` - Already using pure Zod, no custom validators

---

## Benefits for Dynamic Form Generation

All examples now work perfectly with your team's approach:

### 1. **Pure Zod Validation**
```typescript
// Your form generator can simply do:
const result = schema.parse(formData);
// All validation (structure + business logic) happens here
```

### 2. **Clear Error Messages**
```typescript
// Zod returns structured errors with paths:
try {
  schema.parse(formData);
} catch (error) {
  // error.issues[0].path = ["apiUrl"]
  // error.issues[0].message = "API URL must be a valid Bedrock endpoint"
}
```

### 3. **UI Hints Embedded**
```typescript
// Your converter can extract both validation and UI hints:
const field = schema.shape.apiUrl;
const validation = field.parse;  // Zod's validation
const uiHints = field._def.uiMeta; // { widget: "text", placeholder: "..." }
```

### 4. **No Dual Validation**
Before: Zod validation + custom validators (need to call both)
After: Pure Zod (single `.parse()` call does everything)

---

## Migration Pattern

For any connector using custom validators:

```typescript
// ❌ OLD WAY
validation: {
  configSchema: z.object({ url: z.string() }),
  validateConfig: (config) => {
    if (!customCheck(config.url)) {
      return "Error message";
    }
  }
}

// ✅ NEW WAY
validation: {
  configSchema: z.object({
    url: z.string().refine(
      customCheck,
      { message: "Error message" }
    )
  })
}
```

---

## All Linting Passed ✅

No linting errors in any of the updated examples.

