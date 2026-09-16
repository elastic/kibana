# deepagent Knowledge Base: Architecture

## Overview

Architecture is deepagent's primary review concern, accounting for approximately 24% of all feedback items (~120+ items across ~400 PRs). He evaluates every PR through an architectural lens before examining implementation details.

---

## Core Principles

### 1. Plugin Boundary Integrity

The most frequently enforced architectural rule. Plugins are encapsulation units -- their internal implementation details must not leak across boundaries.

**Rules:**
- No importing from another plugin's internal modules (BLOCKER)
- No re-exporting through packages to bypass plugin boundaries (BLOCKER)
- Plugin dependencies must be declared explicitly in `kibana.jsonc`
- Types exposed by a plugin should be minimal and self-contained

**PR #246225 - Actions plugin dependency leaked into ToolHandlerContext (BLOCKER)**
The `ToolHandlerContext` type imported `ActionsClient` from the Actions plugin, meaning any consumer of tool handler types transitively depended on the Actions plugin. The fix was to define a minimal interface within the Agent Builder that described only the needed behavior.

**Anti-pattern:**
```typescript
// In agent_builder plugin - WRONG
import type { ActionsClient } from '@kbn/actions-plugin/server';
export interface ToolHandlerContext {
  actionsClient: ActionsClient;
}
```

**Correct pattern:**
```typescript
// In agent_builder plugin - CORRECT
export interface ToolHandlerContext {
  executeConnector: (connectorId: string, params: unknown) => Promise<unknown>;
}
```

### 2. Utility Code in Packages, Not Plugins

Code that is purely utility (no plugin lifecycle dependency) should live in `@kbn/` packages. This makes it consumable by any module without creating plugin dependencies.

**PR #251858 - Utility code should live in packages (WARNING)**
Code that performs data transformation, string manipulation, or other utility functions does not need to be inside a plugin. Moving it to a package makes it available to any consumer.

**Decision criteria:**
- Does the code need plugin lifecycle hooks (setup/start/stop)? -> Plugin
- Does the code need access to core services? -> Plugin
- Is it a pure function or utility? -> Package
- Is it a type definition? -> Package
- Is it shared across plugins? -> Package

### 3. Browser vs Server Distinction

Browser-side and server-side code execute in different environments and must maintain distinct type contracts.

**PR #241658 - Browser tools need distinct event types from server tools (WARNING)**
Browser tools and server tools have different execution contexts, capabilities, and constraints. They should not share the same event type union -- each should have its own set of event types that accurately represents what can happen in that context.

### 4. Correct Architectural Layer

Kibana has three layers, and code must live in the correct one:
- **Core** (`src/core/`): Fundamental services, plugin infrastructure
- **Platform** (`src/platform/`, `x-pack/platform/`): Shared functionality across solutions
- **Solutions** (`x-pack/solutions/`): Domain-specific features (Observability, Security, Search, etc.)

Code in a higher layer (solutions) can depend on lower layers (platform, core), but not the reverse. Code in the same layer should minimize cross-dependencies.

---

## Registry & Provider Patterns

### The Registry Pattern

deepagent consistently advocates for registry patterns when a system needs to be extensible without modifying core code.

**PR #252493 - Skills registry unification (WARNING)**
Instead of having separate code paths for built-in skills and persisted skills, use a unified registry that accepts multiple providers:

```typescript
// Registry pattern
interface SkillProvider {
  getSkills(): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | undefined>;
}

class SkillRegistry {
  private providers: SkillProvider[] = [];

  registerProvider(provider: SkillProvider) {
    this.providers.push(provider);
  }

  async getAllSkills(): Promise<Skill[]> {
    const results = await Promise.all(
      this.providers.map(p => p.getSkills())
    );
    return results.flat();
  }
}

// Usage
registry.registerProvider(new BuiltInSkillProvider());
registry.registerProvider(new PersistedSkillProvider(savedObjectsClient));
```

**Benefits:**
- New data sources can be added without modifying registry code
- Each provider encapsulates its own data access logic
- The registry provides a unified interface to consumers
- Easy to test (mock providers)

### Provider Interface Design

When designing provider interfaces, keep them minimal and focused:
- One interface per concern
- Methods should return domain types, not data-access types
- Providers should be stateless when possible

---

## Execution Flow & Ordering

### Hook Execution Ordering

**PR #251835 - Hooks RFC execution chain ordering (BLOCKER)**
In the hooks/middleware system, execution order is a fundamental architectural constraint:

1. Data transformations run first
2. Hooks run after transformations
3. Side effects run after hooks

If hooks run before transformations, they operate on raw/untransformed data and may make incorrect decisions. This ordering must be enforced architecturally, not by convention.

**Key principle:** The execution pipeline must be deterministic and well-documented. Consumers of the hook system must be able to reason about what state data is in when their hook runs.

### Event Ordering

Events emitted by the system must follow a deterministic order:
- Events should be emitted at well-defined points in the lifecycle
- The order of event emission should be documented
- Consumers should not rely on implementation-detail ordering

---

## Data Model Architecture

### Data Model Conservatism

**PR #242383 - No aborted status for UI concerns (WARNING)**
The data model should reflect the actual domain state, not UI presentation needs. If the underlying operation wasn't truly aborted at the data level, adding an `aborted` status pollutes the domain model.

**Principle:** Data model changes propagate through the entire system (API, storage, serialization, validation, migration). They should only be made when the domain truly requires them.

### ID Design

**PR #231653 - Numeric IDs creating collision risks (BLOCKER)**
IDs should be:
- String-based (not numeric)
- Namespaced to prevent collisions between systems
- Generated with proper uniqueness guarantees

Numeric IDs create collision risks when multiple systems generate IDs independently, and they limit the ID space unnecessarily.

---

## System Prompt Architecture

**PR #248788 - System prompt centralization (BLOCKER)**

System prompts for LLM interactions must be assembled in a single, well-defined location. Scattered system prompt fragments across multiple modules create:
- Non-auditable prompts (can't see the full prompt in one place)
- Fragile ordering (changing one module can break the prompt)
- Debugging difficulty (which module contributed which part?)
- Security risks (unexpected prompt injection points)

**Architecture:**
```
SystemPromptBuilder (single module)
├── Base instructions (static)
├── Tool descriptions (from tool registry)
├── Context information (from context providers)
└── Final assembly and validation
```

---

## Cross-Cutting Architecture Rules

### Factory Function Closures

All service-dependent code should use factory function closures, not module-level state. See `dependency_injection.md` for details.

### API Surface Minimalism

Every exported symbol is an API commitment. Minimize the public API surface. See `api_design.md` for details.

### Package vs Plugin Decision

| Need | Choice |
|------|--------|
| Pure utility functions | Package |
| Type definitions | Package |
| Shared constants | Package |
| Plugin lifecycle (setup/start/stop) | Plugin |
| Access to core services | Plugin |
| Route registration | Plugin |
| Saved object types | Plugin |

---

## Summary of Severity by Architecture Issue

| Issue | Severity |
|-------|----------|
| Plugin boundary violation | BLOCKER |
| Module-level singleton | BLOCKER |
| Scattered system prompts | BLOCKER |
| Hook execution ordering wrong | BLOCKER |
| Numeric IDs where strings needed | BLOCKER |
| Utility code in plugin (should be package) | WARNING |
| Missing registry pattern for extensibility | WARNING |
| Browser/server types not distinguished | WARNING |
| Code in wrong architectural layer | WARNING |
| Data model changed for UI concern | WARNING |
