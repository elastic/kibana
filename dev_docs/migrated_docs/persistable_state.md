---
id: kibDevDocsPersistableStateIntro
slug: /kibana-dev-docs/key-concepts/persistable-state-intro
title: Persistable State
description: Persitable state is a key concept to understand when building a Kibana plugin.
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'api docs']
---

Persistable state enables plugins to safely store and migrate state that other plugins can persist. This pattern supports complex scenarios like embeddables in dashboards, filters in URLs, and cross-plugin state management.

## Core Concepts

**Persistable State Definition:**
- Developer-defined state that can be persisted by plugins other than the owner
- Must be serializable (JSON-compatible)
- Requires migration utilities for breaking changes
- Supports reference extraction/injection for saved object relationships

**Key Interfaces:**
- `PersistableStateService` - Plugin contract for state operations
- `PersistableStateDefinition` - Registry item interface
- `Serializable` - Base type constraint for state

## Plugin State Exposure Patterns

### Single Plugin State (PersistableStateService)

When your plugin exposes state that others might persist:

```typescript
// In your plugin's setup contract
export interface MyPluginSetup extends PersistableStateService<MyState> {
  // Automatically provides: migrate, extract, inject, telemetry methods
  createFilter(config: FilterConfig): MyState;
}

// Example: Data plugin's filter manager
class FilterManager implements PersistableStateService<Filter> {
  migrate = (state: SerializableRecord, version: string) => {
    // Migrate filter structure changes
    return migratedFilter;
  };
  
  extract = (state: Filter) => {
    // Extract saved object references
    return { state: cleanState, references };
  };
  
  inject = (state: Filter, references: SavedObjectReference[]) => {
    // Inject references back into state
    return hydratedState;
  };
}
```

### Registry Pattern (Multiple State Types)

When your plugin manages a registry of persistable items:

```typescript
// Plugin setup contract
export interface EmbeddableSetup extends PersistableStateService<EmbeddableInput> {
  registerEmbeddableFactory(factory: EmbeddableFactory): void;
}

// Registry item implementation
export class MyEmbeddableFactory implements PersistableStateDefinition<MyEmbeddableInput> {
  id = 'my-embeddable';
  
  migrate = (state: MyEmbeddableInput, version: string) => {
    if (version < '8.0.0') {
      // Migrate old config structure
      return { ...state, newProperty: convertOldProperty(state.oldProperty) };
    }
    return state;
  };
  
  extract = (state: MyEmbeddableInput) => {
    // Extract index pattern references
    const references = [];
    if (state.indexPatternId) {
      references.push({
        id: state.indexPatternId,
        type: 'index-pattern',
        name: 'indexPattern'
      });
    }
    return { state: { ...state, indexPatternId: undefined }, references };
  };
  
  inject = (state: MyEmbeddableInput, references: SavedObjectReference[]) => {
    const indexPatternRef = references.find(ref => ref.name === 'indexPattern');
    return { ...state, indexPatternId: indexPatternRef?.id };
  };
}
```

## State Persistence Scenarios

### Saved Object Storage

When storing persistable state in saved objects:

```typescript
// In your saved object migration
const migrations = {
  '8.1.0': (doc: SavedObjectUnsanitizedDoc) => {
    // Use embeddable plugin's migration service
    const migratedPanels = embeddableService.migrate(doc.attributes.panels, '8.0.0');
    return { ...doc, attributes: { ...doc.attributes, panels: migratedPanels } };
  }
};

// Reference extraction/injection
const extractReferences = (attributes: DashboardAttributes) => {
  const { state: panels, references } = embeddableService.extract(attributes.panels);
  return {
    attributes: { ...attributes, panels },
    references
  };
};

const injectReferences = (attributes: DashboardAttributes, references: SavedObjectReference[]) => {
  const panels = embeddableService.inject(attributes.panels, references);
  return { ...attributes, panels };
};
```

**Example Implementation:**
```typescript
// Dashboard saved object type
export const dashboardSavedObjectType: SavedObjectsType = {
  name: 'dashboard',
  migrations,
  extractReferences,
  injectReferences
};
```

### URL State Storage

For URL-persisted state, implement versioning:

```typescript
// URL structure with version
const urlState = {
  version: '8.1.0',
  filters: [/* filter objects */],
  timeRange: { from: 'now-15m', to: 'now' }
};

// On page load, migrate URL state
const loadStateFromUrl = (urlParams: string) => {
  const parsed = parseRison(urlParams);
  const currentState = filterManager.migrate(parsed, parsed.version || '7.0.0');
  return currentState;
};

// Serialize to URL
const serializeToUrl = (state: FilterState) => {
  const versionedState = { ...state, version: '8.1.0' };
  return encodeRison(versionedState);
};
```

> [!WARNING]
> Always version your URL state! There's no standard pattern yet - implement versioning according to your app's needs.

## State Operations Implementation

### Migration Strategies

```typescript
// Version-based migration
const migrate = (state: MyState, version: string): MyState => {
  if (semver.lt(version, '8.0.0')) {
    // Breaking change: renamed property
    state = { ...state, newName: state.oldName, oldName: undefined };
  }
  
  if (semver.lt(version, '8.5.0')) {
    // New feature: default values
    state = { ...state, enableFeature: true };
  }
  
  return state;
};

// Batch migration utility
const migrateToLatest = (state: MyState, fromVersion: string): MyState => {
  const migrations = ['8.0.0', '8.5.0', '9.0.0'];
  return migrations.reduce((acc, targetVersion) => {
    if (semver.lt(fromVersion, targetVersion)) {
      return migrate(acc, targetVersion);
    }
    return acc;
  }, state);
};
```

### Reference Handling

```typescript
// Complex reference extraction
const extract = (state: VisualizationState) => {
  const references: SavedObjectReference[] = [];
  let extractedState = { ...state };
  
  // Extract index pattern references
  if (state.indexPatternId) {
    references.push({
      id: state.indexPatternId,
      type: 'index-pattern', 
      name: `indexPattern_${references.length}`
    });
    extractedState.indexPatternId = references[references.length - 1].name;
  }
  
  // Extract dashboard filter references
  state.filters?.forEach((filter, index) => {
    if (filter.meta?.index) {
      references.push({
        id: filter.meta.index,
        type: 'index-pattern',
        name: `filter_${index}_indexPattern`
      });
      filter.meta.index = `filter_${index}_indexPattern`;
    }
  });
  
  return { state: extractedState, references };
};

// Reference injection
const inject = (state: VisualizationState, references: SavedObjectReference[]) => {
  let injectedState = { ...state };
  
  // Resolve index pattern reference
  if (typeof state.indexPatternId === 'string' && state.indexPatternId.startsWith('indexPattern_')) {
    const ref = references.find(r => r.name === state.indexPatternId);
    injectedState.indexPatternId = ref?.id;
  }
  
  // Resolve filter references
  injectedState.filters = state.filters?.map((filter, index) => {
    if (typeof filter.meta?.index === 'string' && filter.meta.index.startsWith('filter_')) {
      const ref = references.find(r => r.name === filter.meta.index);
      return { ...filter, meta: { ...filter.meta, index: ref?.id } };
    }
    return filter;
  });
  
  return injectedState;
};
```

### Telemetry Collection

```typescript
const telemetry = (state: MyState, collector: StatsCollector) => {
  collector.incrementCounter('my_state_usage');
  collector.recordValue('state_complexity', Object.keys(state).length);
  
  // Feature usage tracking
  if (state.advancedFeature) {
    collector.incrementCounter('advanced_feature_usage');
  }
  
  // State size metrics
  const serializedSize = JSON.stringify(state).length;
  collector.recordHistogram('state_size_bytes', serializedSize);
};
```

## Implementation Guidelines

### When to Implement PersistableStateService

**✅ Implement when:**
- Other plugins need to persist your state (filters, embeddables, etc.)
- Your state structure may evolve with breaking changes
- State contains saved object references
- You provide a registry of persistable items

**❌ Skip when:**
- Only your plugin stores the state
- State is simple and unlikely to change
- No saved object references involved

### State Design Best Practices

```typescript
// ✅ Good - versioned, serializable state
interface MyState {
  version: string;
  config: {
    enabled: boolean;
    threshold: number;
  };
  references: string[]; // Will be extracted/injected
}

// ❌ Bad - no version, non-serializable
interface BadState {
  config: Map<string, any>; // Maps aren't JSON-serializable
  callback: () => void;     // Functions aren't serializable
  // No version field
}
```

### Error Handling

```typescript
const migrate = (state: MyState, version: string): MyState => {
  try {
    if (semver.lt(version, '8.0.0')) {
      return migrateFromV7(state);
    }
    return state;
  } catch (error) {
    // Log error but don't throw - return best-effort state
    console.warn('State migration failed:', error);
    return getDefaultState();
  }
};

const extract = (state: MyState) => {
  try {
    return doExtraction(state);
  } catch (error) {
    // Return original state if extraction fails
    console.warn('Reference extraction failed:', error);
    return { state, references: [] };
  }
};
```

## Registry Integration Example

**Complete embeddable factory with persistable state:**

```typescript
export class MyEmbeddableFactory 
  extends EmbeddableFactory<MyEmbeddableInput, MyEmbeddableOutput> 
  implements PersistableStateDefinition<MyEmbeddableInput> {
  
  public readonly type = 'my-embeddable';
  
  // Factory methods
  public async createFromSavedObject(/* ... */) { /* ... */ }
  public async create(/* ... */) { /* ... */ }
  
  // Persistable state implementation
  public migrate = (state: MyEmbeddableInput, version: string) => {
    // Handle version migrations
    return migratedState;
  };
  
  public extract = (state: MyEmbeddableInput) => {
    // Extract saved object references
    return { state: cleanState, references };
  };
  
  public inject = (state: MyEmbeddableInput, references: SavedObjectReference[]) => {
    // Inject references back
    return hydratedState;
  };
  
  public telemetry = (state: MyEmbeddableInput, collector: StatsCollector) => {
    // Collect usage statistics
    collector.incrementCounter('my_embeddable_usage');
  };
}
```

## Reference Links

**Code Examples:**
- [Embeddable factory example](https://github.com/elastic/kibana/blob/8.9/examples/embeddable_examples/public/migrations/migrations_embeddable_factory.ts)
- [Saved object with persistable state](https://github.com/elastic/kibana/blob/8.9/examples/embeddable_examples/server/searchable_list_saved_object.ts#L32)

**Related Documentation:**
- [Saved Object References](saved_objects.md#references)
- [Migration Guide](../tutorials/saved_objects.mdx#migrations)

> [!NOTE]
> Future improvements planned: easier identification of persistable state, automatic migration prompts for producers, and clearer safety indicators for consumers.