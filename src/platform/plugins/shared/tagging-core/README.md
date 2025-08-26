# Tagging Core Plugin

## Overview

The `tagging-core` plugin provides core tagging functionality for Kibana, designed to break circular dependencies between the home plugin and the management plugin.

## Architecture Changes

### Problem
The original architecture had a circular dependency:
```
management -> home -> savedObjectsTaggingOss -> savedObjects -> data -> management
```

This prevented the home plugin from accessing tagging functionality directly.

### Solution
The tagging functionality was split into two separate plugins:

1. **`tagging-core`** - Core tagging logic and services
2. **`tagging-ui`** - UI components for tagging

This breakdown allows the home plugin to depend on `tagging-core` without creating circular dependencies.

## Plugin Structure

### Dependencies
- **Required Plugins**: None (intentionally minimal to avoid circular dependencies)
- **Server**: false (client-side only)

### Key Features
- `ITagsClient` interface for tag operations
- `findObjectsByTags()` method for searching tagged content
- Content management service integration
- Tag ID to name conversion utilities

## Integration with Content Management

The plugin integrates with Kibana's content management service to search for tagged objects:

```typescript
// Example usage
const taggedObjects = await tagsClient.findObjectsByTags(['tag1', 'tag2']);
```

## Breaking Changes

This architectural change is **not production-ready** and would require:
1. Migration of existing tagging consumers
2. Breaking change process
3. Documentation updates for plugin developers

## Usage in Home Plugin

The home plugin now depends on `tagging-core` and `tagging-ui` instead of the full `savedObjectsTaggingOss` plugin, allowing it to display tagged items without circular dependencies.

## Future Considerations

- Evaluate if this architecture should be adopted more broadly
- Consider creating migration guides for existing tagging consumers
- Document the new plugin boundaries and responsibilities
