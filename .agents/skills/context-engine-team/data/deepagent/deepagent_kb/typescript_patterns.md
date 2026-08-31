# deepagent Knowledge Base: TypeScript Patterns

## Overview

TypeScript type safety is a significant review concern for deepagent (~30+ items across ~400 PRs). He views the type system not just as a bug-catching tool but as an architectural enforcement mechanism. Types should encode domain constraints and make invalid states unrepresentable.

---

## Core Principles

### 1. Types as Architecture

Types define the contracts between modules. Well-designed types:
- Prevent invalid states at compile time
- Document expected behavior without comments
- Enable safe refactoring across the codebase
- Make breaking changes visible in diffs

### 2. No `any`

The `any` type disables TypeScript's safety guarantees. Prefer:
- `unknown` with type narrowing for truly unknown values
- Proper generic types for flexible abstractions
- Specific union types for known alternatives

### 3. Explicit Over Implicit

For public APIs and exported functions, prefer explicit types over inference. Internal implementation can rely more on inference.

---

## Type Guards

### Proper Return Signatures

**PR #243661 - Type guards with proper return signatures (WARNING)**

Type guard functions must use the type predicate return syntax (`x is Type`). Without it, TypeScript cannot narrow the type in subsequent code.

```typescript
// BAD - TypeScript can't narrow
function isToolCallEvent(event: unknown): boolean {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    (event as any).type === 'tool_call'
  );
}

// After calling isToolCallEvent(event), event is still 'unknown'
if (isToolCallEvent(event)) {
  event.toolName; // Error: 'unknown' has no property 'toolName'
}
```

```typescript
// GOOD - TypeScript narrows correctly
function isToolCallEvent(event: unknown): event is ToolCallEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    (event as Record<string, unknown>).type === 'tool_call'
  );
}

// After calling isToolCallEvent(event), event is narrowed to ToolCallEvent
if (isToolCallEvent(event)) {
  event.toolName; // Works! TypeScript knows this is ToolCallEvent
}
```

**Key points:**
- Always return `x is Type`, not just `boolean`
- Use `unknown` as the input type when the guard is for arbitrary values
- Avoid `as any` inside guards -- use `as Record<string, unknown>` for safe property access

---

## Discriminated Unions

### Over Optional Fields

**PR #234985 - Discriminated unions over optional fields (WARNING)**

When a type can be in one of several states, use a discriminated union with a literal type discriminant. This makes impossible states unrepresentable.

```typescript
// BAD - many possible invalid combinations
interface Message {
  role: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolResult?: unknown;
}

// What does it mean if role is 'user' but toolCallId is set?
// The type allows this invalid state.
```

```typescript
// GOOD - only valid states are representable
type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; toolName: string; toolResult: unknown };

// TypeScript enforces valid combinations
const msg: Message = {
  role: 'user',
  toolCallId: 'abc', // Error! 'toolCallId' does not exist on user messages
};
```

**When to use discriminated unions:**
- When different variants have different required fields
- When you need exhaustive switch/case handling
- When the type represents a state machine (each variant is a state)
- When optional fields lead to ambiguous or invalid combinations

**Discriminant design:**
- Use a literal type property (string, number, or boolean literal)
- Common discriminant names: `type`, `kind`, `role`, `status`
- The discriminant should be the first property listed for readability

---

## Type Extraction & Naming

### Extract Inline Types

**PR #251835 - Extract inline types to named types (WARNING)**

Inline object types in function signatures should be extracted to named types, especially for:
- Public APIs (consumers need to import the type)
- Types used in multiple places
- Complex types that would benefit from a descriptive name

```typescript
// BAD - inline types in public API
export function registerHook(config: {
  id: string;
  name: string;
  triggers: string[];
  handler: (context: {
    event: { type: string; payload: unknown };
    services: { savedObjects: SavedObjectsClient };
  }) => Promise<void>;
}) { ... }

// GOOD - named types
export interface HookConfig {
  id: string;
  name: string;
  triggers: HookTrigger[];
  handler: HookHandler;
}

export type HookTrigger = string;

export type HookHandler = (context: HookHandlerContext) => Promise<void>;

export interface HookHandlerContext {
  event: HookEvent;
  services: HookServices;
}

export interface HookEvent {
  type: string;
  payload: unknown;
}

export interface HookServices {
  savedObjects: SavedObjectsClient;
}

export function registerHook(config: HookConfig) { ... }
```

### interface vs type

**PR #229224 - interface vs type semantics (NIT)**

Choose based on semantic intent:

| Use `interface` when | Use `type` when |
|---------------------|-----------------|
| Describing an object shape | Creating a union type |
| The type will be implemented by a class | Creating an intersection type |
| The type will be extended | Creating a mapped type |
| You want declaration merging | Creating an alias for a primitive |

```typescript
// GOOD use of interface - object shape
interface ToolConfig {
  name: string;
  description: string;
}

// GOOD use of type - union
type ToolResult = ToolSuccess | ToolError;

// GOOD use of type - mapped
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// GOOD use of type - alias
type ToolId = string;
```

### import type

Use `import type` for imports that are only used as types. This ensures the import is erased at compile time and doesn't create a runtime dependency.

```typescript
// GOOD
import type { ToolConfig } from './types';
import { createTool } from './factory';
```

---

## Generics

### Type-Safe Abstractions

Use generics when the abstraction works with multiple types but needs to maintain type relationships:

```typescript
// GOOD - generic registry maintains type safety
class Registry<T extends { id: string }> {
  private items = new Map<string, T>();

  register(item: T): void {
    this.items.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }
}
```

### Constraints

Use generic constraints (`extends`) to limit what types can be used:

```typescript
// GOOD - constraint ensures T has the required structure
function getToolById<T extends { id: string; name: string }>(
  tools: T[],
  id: string
): T | undefined {
  return tools.find(tool => tool.id === id);
}
```

---

## Immutability

### readonly and as const

**Use `readonly` for:**
- Properties that should not be modified after construction
- Function parameters that should not be mutated
- Array parameters that should not be modified

```typescript
// GOOD
interface ToolConfig {
  readonly name: string;
  readonly description: string;
  readonly schema: Readonly<Record<string, unknown>>;
}
```

**Use `as const` for:**
- Literal values that should have their literal type (not widened)
- Configuration objects that should be treated as constants

```typescript
// GOOD
const TOOL_TYPES = ['search', 'analyze', 'transform'] as const;
type ToolType = typeof TOOL_TYPES[number]; // 'search' | 'analyze' | 'transform'
```

---

## Common Anti-patterns

### 1. Type Guard Without Predicate
Already covered above. Always use `x is Type`.

### 2. Optional Fields Soup
Already covered above. Use discriminated unions.

### 3. Inline Types in Public APIs
Already covered above. Extract to named types.

### 4. Using `any` for Escape Hatch

```typescript
// BAD
function processEvent(event: any) { ... }

// GOOD
function processEvent(event: unknown) {
  if (isToolCallEvent(event)) {
    // event is now narrowed to ToolCallEvent
  }
}
```

### 5. Non-Null Assertions Without Justification

```typescript
// BAD - silently hiding potential null
const name = user!.name;

// GOOD - explicit check
if (!user) {
  throw new Error('User is required');
}
const name = user.name;
```

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Type guard missing predicate return | WARNING |
| Optional fields where discriminated union needed | WARNING |
| Inline types for public API | WARNING |
| Using `any` | WARNING |
| interface vs type semantic choice | NIT |
| Missing `import type` | NIT |
| Missing `readonly` / `as const` | NIT |
| Non-null assertion without justification | WARNING |
