# Add Skill Type System and Infrastructure for Agent Builder

## Summary

This PR introduces a comprehensive type system and infrastructure for defining and registering skills in the Agent Builder framework. Skills provide structured, reusable capabilities that agents can leverage, with strong type safety and organizational structure.

## Key Changes

### 1. Type System Infrastructure (`agent-builder-server/skills/`)

- **`type_definition.ts`**: Core `SkillTypeDefinition` interface with:
  - Strict typing for skill IDs, names, paths, and descriptions
  - Support for tool exposure via `getAllowedTools()` and `getInlineTools()`
  - Directory structure validation through TypeScript types
  - Helper function `defineSkillType()` for type inference

- **`type_utils.ts`**: Type utilities for:
  - Directory structure modeling (`Directory`, `FileDirectory`)
  - Path extraction from directory structures (`FilePathsFromStructure`)
  - String validation (`StringWithoutSlash`, `StringWithoutSpace`)

- **`type_utils.test.ts`**: Comprehensive type-level tests validating the directory structure and path extraction logic

- **`tools.ts`**: Type definitions for skill-bounded tools, supporting:
  - Built-in tools
  - ESQL tools
  - Index search tools
  - Workflow tools

### 2. Skill Service (`agent_builder/server/services/skills/`)

- **`skill_service.ts`**: Main service managing skill lifecycle:
  - Setup phase for skill registration
  - Start phase for skill retrieval and listing

- **`skill_type_registry.ts`**: Registry implementation:
  - Skill registration with duplicate detection (by ID and full path)
  - Skill lookup and listing capabilities
  - Validation of unique skill paths

- **`types.ts`**: Service contracts for setup and start phases

### 3. Plugin Integration

- Integrated skill service into the Agent Builder plugin lifecycle
- Exposed `registerSkill` API through plugin setup contract
- Added skill service to internal service dependencies

### 4. Example Implementation: Threat Analysis Skill

- **`threat_analysis_skill.ts`**: Sample skill demonstrating:
  - Skill definition with comprehensive body content
  - Tool exposure via `getAllowedTools()`
  - Inline tool definition via `getInlineTools()`
  - Integration with security solution tools

- **`register_skills.ts`**: Registration helper for security solution skills

### 5. Type Improvements

- Enhanced `platformCoreTool()` function with proper generic typing
- Converted `AGENT_BUILDER_BUILTIN_TOOLS` and `AGENT_BUILDER_BUILTIN_AGENTS` to `as const` for better type inference
- Added type exports for built-in tools and agents

## Technical Details

### Directory Structure Validation

The type system enforces a strict directory structure for skills, ensuring they are organized logically. The current structure includes:
- `skills/platform/`
- `skills/observability/`
- `skills/security/alerts/rules/`
- `skills/security/entities/`
- `skills/search/`

New directories can be added by updating the `DirectoryStructure` type in `type_definition.ts`.

### Type Safety Features

- **Path validation**: Only valid paths from the directory structure are accepted
- **Name validation**: Skill names cannot contain spaces or slashes
- **Unique constraints**: Skills must have unique IDs and unique `path:name` combinations
- **Tool type safety**: Skill-bounded tools maintain type safety while removing tags and availability constraints

## Testing

- Added comprehensive type-level tests in `type_utils.test.ts` validating:
  - Valid path extraction from directory structures
  - Invalid path rejection
  - Nested directory handling
  - FileDirectory vs Directory distinction

## Breaking Changes

None - this is a new feature addition.

## Follow-up Work

- The `getInlineTools()` handler in `threat_analysis_skill.ts` contains a TODO and needs implementation
- Additional skills can be registered following the pattern established in the security solution

## Files Changed

- **19 files changed**: 667 insertions, 7 deletions
- New files: 12
- Modified files: 7

