# deepagent Knowledge Base: Naming Conventions

## Overview

Naming and readability is deepagent's second most common feedback category (~60+ items across ~400 PRs). He views naming as a first-class concern because names are the primary documentation for code. Good names reduce the need for comments, prevent API misuse, and make code self-documenting.

---

## Core Principles

### 1. Names Should Match Behavior

**PR #248211 - Function name should match its actual behavior (WARNING)**

A function's name must accurately describe what it does. If the name implies a different contract than the implementation, it's a bug waiting to happen.

```typescript
// BAD - name implies it returns all tools, but it filters by status
function getTools(): Tool[] {
  return allTools.filter(t => t.status === 'active');
}

// GOOD - name accurately describes behavior
function getActiveTools(): Tool[] {
  return allTools.filter(t => t.status === 'active');
}
```

### 2. Names Should Be Descriptive

Avoid single-letter names (outside tight loops), abbreviations, and acronyms that aren't universally understood.

```typescript
// BAD
const t = getTools();
const cfg = loadConfig();
const hdlr = createHandler();

// GOOD
const tools = getTools();
const config = loadConfig();
const handler = createHandler();
```

### 3. Names Should Be Domain-Appropriate

Use domain terminology consistently. If the domain calls something a "skill", don't call it a "capability" or "ability" in code.

---

## Casing Rules

### File Names: snake_case

All new files must use snake_case (lowercase with underscores):

```
tool_registry.ts       // GOOD
tool_registry.test.ts  // GOOD
ToolRegistry.ts        // BAD (PascalCase file name)
toolRegistry.ts        // BAD (camelCase file name)
```

**Exception:** Existing files that follow a different convention should not be renamed unless the rename is the purpose of the PR.

### TypeScript Identifiers

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `ToolRegistry` |
| Interfaces | PascalCase | `ToolConfig` |
| Type aliases | PascalCase | `ToolHandler` |
| Enums | PascalCase | `ToolStatus` |
| Enum members | PascalCase or UPPER_SNAKE | `ToolStatus.Active` or `ACTIVE` |
| Functions | camelCase | `createTool` |
| Variables | camelCase | `toolRegistry` |
| Constants | UPPER_SNAKE_CASE or camelCase | `MAX_TOOLS` or `defaultConfig` |
| React components | PascalCase | `ToolPanel` |

### API-Facing Types: snake_case

**PR #243490 - snake_case for domain models surfaced in APIs (WARNING)**
**PR #232182 - snake_case for tool_result_id (WARNING)**

Types that are serialized to/from REST APIs use snake_case for field names. This is consistent with Elasticsearch and Kibana conventions.

```typescript
// Internal type (camelCase)
interface InternalTool {
  toolId: string;
  toolName: string;
  isActive: boolean;
}

// API type (snake_case)
interface ApiTool {
  tool_id: string;
  tool_name: string;
  is_active: boolean;
}
```

**When to use which:**
- Types that cross an API boundary (request/response bodies) -> snake_case
- Types used only internally within TypeScript code -> camelCase
- If a type is used both internally and in APIs, create separate types or a transformation layer

---

## Enum vs Magic Strings

### Use Enums Over Magic Strings

**PR #234272 - Enum over magic strings (WARNING)**

String literals used as discriminants, action types, or status values should be defined as enums or const objects. Magic strings are typo-prone and hard to refactor.

```typescript
// BAD - magic strings
function handleEvent(type: string) {
  if (type === 'tool_call') { ... }
  if (type === 'tool_result') { ... }
  if (type === 'user_message') { ... }
}

// GOOD - enum
enum EventType {
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  UserMessage = 'user_message',
}

function handleEvent(type: EventType) {
  if (type === EventType.ToolCall) { ... }
  if (type === EventType.ToolResult) { ... }
  if (type === EventType.UserMessage) { ... }
}
```

**Alternative: const object with `as const`:**

```typescript
// Also acceptable
const EVENT_TYPES = {
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  USER_MESSAGE: 'user_message',
} as const;

type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
```

**When to use enums vs const objects:**
- Use `enum` when values are used in switch statements or discriminated unions
- Use `as const` objects when you need the values as a plain object (e.g., for iteration)
- Either is better than magic strings

---

## Boolean Naming

Boolean variables and parameters should be named to read naturally in conditions:

```typescript
// BAD - ambiguous
const tool: boolean;
const active: boolean;

// GOOD - reads naturally in conditions
const isTool: boolean;
const isActive: boolean;
const hasPermission: boolean;
const shouldValidate: boolean;
const canExecute: boolean;
```

**Common prefixes for booleans:**
- `is` - state check (`isActive`, `isVisible`, `isLoading`)
- `has` - possession check (`hasPermission`, `hasChildren`)
- `should` - decision flag (`shouldValidate`, `shouldRetry`)
- `can` - capability check (`canExecute`, `canEdit`)

---

## Function Naming

### Verb-First for Actions

Functions that perform actions should start with a verb:

```typescript
// GOOD
function createTool(config: ToolConfig): Tool { ... }
function deleteTool(toolId: string): void { ... }
function validateSchema(schema: unknown): ValidationResult { ... }
function registerProvider(provider: Provider): void { ... }
```

### get/find/fetch Distinction

- `get`: Returns the value synchronously or throws if not found
- `find`: Returns the value or undefined/null (doesn't throw)
- `fetch`: Involves an async operation (network, database)

```typescript
// Returns Tool or throws
function getTool(id: string): Tool { ... }

// Returns Tool or undefined
function findTool(id: string): Tool | undefined { ... }

// Async operation
async function fetchTool(id: string): Promise<Tool> { ... }
```

### create vs build vs make

- `create`: Creates a new instance with side effects (persistence, registration)
- `build`: Constructs an object from parts (no side effects)
- `make`: Similar to build (used in some contexts)

```typescript
// Persists to database
async function createTool(config: ToolConfig): Promise<Tool> { ... }

// Constructs in memory
function buildToolConfig(params: Partial<ToolConfig>): ToolConfig { ... }
```

---

## Type Naming

### Interface/Type Naming

```typescript
// GOOD - describes the shape
interface ToolConfig { ... }
interface HookHandler { ... }
interface SkillProvider { ... }

// BAD - redundant prefix/suffix
interface IToolConfig { ... }     // Don't prefix with I
interface ToolConfigType { ... }  // Don't suffix with Type
interface ToolConfigInterface { ... }  // Don't suffix with Interface
```

### Generic Type Parameters

Use descriptive names for generic type parameters when the meaning isn't obvious from context:

```typescript
// BAD - unclear
function transform<T, U>(input: T): U { ... }

// GOOD - descriptive
function transform<TInput, TOutput>(input: TInput): TOutput { ... }

// ACCEPTABLE - single letter when context is clear
function identity<T>(value: T): T { return value; }
```

---

## Common Anti-patterns

### 1. Magic Strings
Already covered. Use enums or const objects.

### 2. Misleading Function Names
Already covered. Names must match behavior.

### 3. Abbreviations
```typescript
// BAD
const btn = document.getElementById('btn');
const cfg = getConfig();
const ctx = createContext();

// GOOD
const button = document.getElementById('button');
const config = getConfig();
const context = createContext();
```

### 4. Negative Boolean Names
```typescript
// BAD - double negation in conditions
const isNotDisabled = true;
if (!isNotDisabled) { ... } // Hard to parse

// GOOD - positive naming
const isEnabled = true;
if (!isEnabled) { ... } // Clear
```

### 5. Generic Names
```typescript
// BAD
const data = fetchData();
const result = process(data);
const info = getInfo();

// GOOD
const tools = fetchTools();
const validatedTools = validateTools(tools);
const toolMetadata = getToolMetadata();
```

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Function name doesn't match behavior | WARNING |
| Magic strings instead of enum | WARNING |
| snake_case not used for API types | WARNING |
| Misleading or ambiguous names | WARNING |
| PascalCase file names (new files) | NIT |
| Abbreviations | NIT |
| Generic names (data, result, info) | NIT |
| Negative boolean names | NIT |
