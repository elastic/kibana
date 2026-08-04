# deepagent Knowledge Base: API Design

## Overview

API design is deepagent's fourth most common review concern (~50+ items across ~400 PRs). He evaluates APIs through the lens of extensibility, minimalism, and consistency. His core belief: every API is a contract, and contracts should be as small and generic as possible.

---

## Core Principles

### 1. API Surface Minimalism

Every exported function, type, and endpoint is an API commitment. Once published, it must be maintained for backward compatibility.

**Rules:**
- Export the minimum necessary
- Prefer fewer, more generic APIs over many specialized ones
- Question every new parameter: "Is this truly needed?"
- If a value can be derived, don't make it a parameter
- Consolidate endpoints when possible

### 2. Extensibility Through Design

APIs should be designed for extensibility from the start, using patterns that allow additive changes without breaking existing consumers.

**PR #251631 - action: string over resend: boolean (WARNING)**

Boolean parameters are a dead end -- they can only represent two states. String enums allow adding new options without breaking changes.

```typescript
// BAD - locked into two options
function submitMessage(message: string, resend: boolean) { ... }
submitMessage('hello', true);  // What does true mean here?

// GOOD - extensible and self-documenting
type MessageAction = 'send' | 'resend' | 'edit';
function submitMessage(message: string, action: MessageAction) { ... }
submitMessage('hello', 'resend');  // Clear intent
```

**Principle:** Prefer string unions over booleans for any parameter that might gain additional values in the future.

### 3. Generic Over Opinionated

APIs should not encode assumptions about specific consumers or data shapes.

**PR #254264 - Origin API too opinionated (WARNING)**

An API that hardcodes a `saved_object_id` shape forces all consumers into a saved-object worldview:

```typescript
// BAD - too opinionated
interface OriginConfig {
  saved_object_id: string;
  saved_object_type: string;
}

// GOOD - generic
interface OriginConfig {
  type: string;
  id: string;
  metadata?: Record<string, unknown>;
}
```

**Decision criteria for generic vs specific:**
- Will multiple consumers use this API? -> Generic
- Is this an internal implementation detail? -> Can be specific
- Will the shape change as the system evolves? -> Generic
- Is type safety more important than flexibility? -> Specific with generics

---

## Naming Conventions

### snake_case for API-Facing Types

**PR #243490 - snake_case for domain models surfaced in APIs (WARNING)**
**PR #232182 - snake_case for tool_result_id (WARNING)**

All field names in types that are serialized to/from REST APIs must use snake_case. This is consistent with Elasticsearch and Kibana conventions.

```typescript
// BAD
interface ToolResult {
  toolCallId: string;    // camelCase in API payload
  resultContent: string;
}

// GOOD
interface ToolResult {
  tool_call_id: string;  // snake_case in API payload
  result_content: string;
}
```

**Note:** Internal-only types that never cross an API boundary can use camelCase per TypeScript convention. The snake_case rule applies only to types that are serialized/deserialized in API payloads.

---

## Type Design for APIs

### Named Types, Not Inline

**PR #239904 - No inline types for public API contracts (WARNING)**

Public APIs must define named types for parameters and return values. Inline types cannot be imported by consumers, don't show up in API documentation, and make breaking changes invisible.

```typescript
// BAD
export function createTool(config: {
  name: string;
  handler: (input: { query: string }) => Promise<string>;
}) { ... }

// GOOD
export interface ToolConfig {
  name: string;
  handler: ToolHandler;
}
export type ToolHandler = (input: ToolInput) => Promise<string>;
export interface ToolInput {
  query: string;
}
export function createTool(config: ToolConfig) { ... }
```

### Domain-Specific Reference Types

Create specific types for domain concepts rather than using primitive types:

```typescript
// BAD
function getSkill(id: string): Promise<Skill>;  // What kind of ID?

// GOOD
type SkillId = string;
function getSkill(id: SkillId): Promise<Skill>;  // Clear domain concept
```

---

## Endpoint Design

### Unified Endpoints Over Parallel APIs

**PR #252493 - Skills registry unification (WARNING)**

When multiple data sources serve the same domain concept, prefer a single unified endpoint over parallel endpoints:

```
// BAD - parallel endpoints
GET /api/agent_builder/skills/builtin
GET /api/agent_builder/skills/persisted

// GOOD - unified endpoint with optional filter
GET /api/agent_builder/skills
GET /api/agent_builder/skills?source=builtin
```

### Additive Changes Over Breaking

When evolving an API:
- Add new optional fields rather than changing existing ones
- Add new endpoints rather than changing existing response shapes
- Use versioning if breaking changes are unavoidable
- Never remove fields from responses without deprecation

### Server-Side Validation

All API inputs must be validated on the server side. Never rely on client-side validation for security or correctness.

```typescript
// Route definition with validation
router.post(
  {
    path: '/api/agent_builder/tools',
    validate: {
      body: schema.object({
        name: schema.string({ minLength: 1, maxLength: 100 }),
        description: schema.string({ minLength: 1 }),
        schema: schema.recordOf(schema.string(), schema.any()),
      }),
    },
  },
  handler
);
```

---

## API Response Consistency

### Consistent Response Shapes

All API responses within a domain should follow a consistent shape:

```typescript
// List endpoint
{ items: T[], total: number }

// Single item endpoint
T

// Error response
{ statusCode: number, error: string, message: string }
```

### Proper HTTP Methods and Status Codes

| Operation | Method | Success Code |
|-----------|--------|-------------|
| Read single | GET | 200 |
| Read list | GET | 200 |
| Create | POST | 201 |
| Update (full) | PUT | 200 |
| Update (partial) | PATCH | 200 |
| Delete | DELETE | 204 |

---

## Common API Anti-patterns

### 1. Boolean Parameters for Extensible Actions
Already covered above. Use string unions.

### 2. Opinionated Data Shapes
Already covered above. Use generic shapes.

### 3. Leaking Implementation Through API Types
API types should describe the domain, not the implementation:

```typescript
// BAD - leaks that we use Elasticsearch
interface SearchResponse {
  _source: Record<string, unknown>;
  _index: string;
}

// GOOD - domain-focused
interface SearchResult {
  id: string;
  fields: Record<string, unknown>;
}
```

### 4. Missing Pagination
List endpoints must support pagination from the start. Adding it later is a breaking change.

### 5. Exposing Internal IDs
Internal storage IDs (Elasticsearch document IDs, Saved Object IDs) should not be exposed directly in APIs unless they are also the domain ID.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| API too opinionated on data shape | WARNING |
| Boolean where string enum needed | WARNING |
| Inline types for public API | WARNING |
| snake_case not used for API types | WARNING |
| Missing server-side validation | WARNING |
| Parallel endpoints instead of unified | WARNING |
| Breaking change without deprecation | BLOCKER |
| Missing pagination on list endpoint | WARNING |
