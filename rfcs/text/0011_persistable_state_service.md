- Start Date: 2020-06-02
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Pluggable state from registry items can often end up stored inside saved objects, for instance:
Embeddables, Expression strings, Url generators, ...

When plugin A (persister) stores some state that belongs to another plugin B a few issues arise:
- How does persister know if plugin B state contains references to saved objects
- How does persister migrate the saved object when it contains state that belongs to plugin B
- How does persister know if state that belongs to plugin B contains state that belongs to plugin C

# Basic example

```ts

const MY_STATE_ID = 'MyState';

interface MyStateV76 extends PersistableState {
  object: string,
  val: number,
}

interface MyStateV77 extends PersistableState {
  objectId: string,
  val: number,
}

interface MyState extends PersistableState {
  objectId: string,
  value: number,
}

const migrate = (state: unknown, version: string) => {
  let v76 = version === '7.6' ? state as MyStateV76 : undefined;
  let v77 = version === '7.7' ? state as MyStateV77 : undefined;
  let v78 = version === '7.8' ? state as MyState : undefined;
  if (v76) {
    v77 = { objectId: v76.object, val: v76.val };
  }
  if (v77) {
    v78 = { objectId: v77.objectId, value: v77.val };
  }
  
  return newState;
}

const inject = (state: MyState, savedObjectReferences: SavedObjectReference[]) => {
  return {
    ...state,
    objectId: savedObjectReferences.find(ref => ref.name = state.objectId)?.id;
  }
}

const extract = (state: MyState) => {
  const references = [{ name: 'objectId', id: state.objectId, type: 'savedObject' }];
  return [{ ...state, objectId: 'objectId' }, references];
}

persistableStateService.register(MY_STATE_ID, { migrate, inject, extract });
```

```ts
  const stateReadyForPersisting = persistableStateService.get(MY_STATE_ID),beforeSave(myState);
  const stateReadyForConsuming = persistableStateService.get(MY_STATE_ID).afterLoad(stateReadyForPersisting);
```

# Motivation

We need a formal way for authors of registry implementations to add migrations for this data. Since they may not own the saved object that their implementation ends up in, we can't rely on saved object migrations as it exists today (not to mention data that ends up in URLs that may need to be migrated).

We also need to make sure that all the persited state containing references to saved objects extracts those before being saved and injects them later.

# Detailed design

```ts
interface PersistableState extends Serializable {}

interface PersistableStateDefinition {
  id: string,
  // migrate function receives state and version string and should return latest state version
  // default is identity function
  migrate: (state: PersistableState, version: string) => PersistableState,
  // inject function receives state and a list of references and should return state with references injected
  // default is identity function
  inject: (state: PersistableState, references: SavedObjectReference[]) => PersistableState,
  // extract function receives state and should return state with references extracted and array of references
  // default returns same state with empty reference array
  extract: (state: PersistableState) => { state: PersistableState, references: SavedObjectReference[] }
}

class PersistableStatePlugin {
  setup(core, plugins) {
    return {
      // if one of the functions is not provided default is used 
      // so we can always assume that all of the functions are available for every persistable state 
      register: (id: string, definition: Partial<PersistableStateDefinition>) => void
    }
  }
  start(core, plugins) {
    return {
      // get will always return. If requested persistable state is not defined it will return default set of functions.
      get: (id: string) => PersistableStateDefinition,
      // takes the state, extracts the references and returns them + version string
      beforeSave: (id: string, state: PersistableState) => [PersistableState, SavedObjectReference[], string],
      // takes the state, references and version and returns latest (migrated) state with references injected
      afterLoad: (id: string, state: PersistableState, references: SavedObjectReference[], version: string) => PersistableState,
    }
  }
}
```


# Consuming and edge cases

When plugin A wants to store some state that it does not own it should check with persistableStateRegistry for a registered persistable state definition and execute `beforeSave` function.

```ts
  const stateForSaving = persistableStatePlugin.beforeSave(id, myState);

``` 

WARNING: If state id is known at compile time we should rather import the correct utilities directly from expression plugin. As using the registry can hide dependencies between plugins when possible plugins should directly depend on plugins providing the state they want to store.

## Handling corrupt state

This is up to the registrator, but we will try to come up with a good recomendation.

## EnhacedDrilldownEmbeddableInput

Drilldown  plugin adds to the state of embeddable:

```ts
interface EnhancedDrilldownEmbeddableInput extends EmbeddableInput {
  enhancements: {
    drillDowns: { events?: Events[];  }
  }
}
```
Embeddable is aware that it has an enhancements property on its state, where every key represents state of another plugin.

```ts
const inject = (state, references) => {
  Object.getKeys(state.enhancements).forEach(key => {
    State.enhancements[key] = persistableStatePlugin.get(key).inject(state.enhancements[key], references);
  }
}
```

And drilldown plugin registers its state with persistableStateService.

##

## Use a `{pluginId}+{stateType}` pattern for your ID

To avoid clashes with other unknown plugins.

## We have to avoid shared persistable state

So we have to do two things:

- Always call a migration function for nested state.
- Maintain state boundaries along plugin boundaries. Do not allow VisualizeEmbeddableInput to migrate data on EmbeddableInput. Don't even give it access to this state at all.
As long as state ownership is isolated, we can do something like this:

```ts
const embeddableMigrator: PersistableStateMigrationFn (state: { type: string; input: unknown }, version: string): State {
  return {
    ...migrateInputToLatest(state.input),
    enhancements: {
       ...state.input.enhancements.map(enhancement => 
          persistableStateMigrations.get(enhancement).migrate(state.input.enhancements[extension], version)),
    },
    specializedState: persistableStateMigrations.get(state.type).migrate(state.input.specializedState, version)),
  }
}
```

The key here is that we have to separate out the state owned by VisualizeEmbeddableInput and that owned by EmbeddableInput. If we allow them both access to the full input (VisualizeEmbeddableInput extends EmbeddableInput), there is the possibility for key clashes. For instance:

```ts
// We start out with the base class having an attribute of `title`. 
interface EmbeddableInputV1 {
  title: string;
}

// `Title` is taken by the base class, so Visualize plugin adds `defaultTitle`.
interface VisualizeEmbeddableInputV1 implements EmbeddableInputV1 {
  defaultTitle: string;
}

// In a future version, EmbeddableInput author decides to rename `title` => `defaultTitle`.
// They don't know about `VisualizeEmbeddableInput` so don't realize there is going to be
// a key collision.
interface EmbeddableInputV2 {
  defaultTitle: string;
}
```

It's probably a rare occurrence, but it's also very risky. EmbeddableInput thinks it owns defaultTitle. Let's say it decides to change the name yet again, so in V3 changes it to customPanelTitle and removes defaultTitle. Let's also say VisualizeEmbeddable author doesn't add a migration for V2 or V3. A user migrates to V3, VisualizeEmbeddable just had its defaultTitle state wiped out unknowingly (types will still say it's a required parameters). This has the potential to permanently break saved objects with no way to undo the migration.

# Drawbacks

- teaching impact: everyone storing state from belonging to another plugin will need to remember to use this service when saving and loading state.
- this proposal uses a different pattern than the current SO migration system which is having SOs register a migration function per version, where this system has users register a single function across all versions. That means consumer doesn't care what version his state is, he can assume he will always get the latest state out of the migrate function.

# Adoption strategy

First app arch team will add persistable state definitions for saved visualizations and saved searches (vis state, search source), expressions and base embeddables. Adoption by other teams can happen gradually.

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?