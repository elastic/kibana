- Start Date: 2020-06-02
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Pluggable state from registry items can often end up stored inside saved objects, for instance:
Embeddables, Expression strings, Url generators, ...

When plugin A (persister) stores some state that belongs to another plugin B (registrator) a few issues arise:
- How does persister know if plugin B state contains references to saved objects
- How does persister migrate the saved object when it contains state that belongs to plugin B
- How does persister know if state that belongs to plugin B contains state that belongs to plugin C

In order to solve the problem we are proposing implementing a `PersistableStateRegistry` to which registrators can register `PersistableStateDefinition` which persisters can then use to do the above tasks.

# Basic example

registrator plugin registers its `PersistableStateDefinition`

```ts

export const MY_STATE_ID = 'MyState';

interface MyStateV76 extends PersistableState {
  object: string,
  val: number,
}

interface MyStateV77 extends PersistableState {
  objectId: string,
  val: number,
}

export interface MyState extends PersistableState {
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
  
  return v78;
}

const inject = (state: MyState, savedObjectReferences: SavedObjectReference[]) => {
  return {
    ...state,
    objectId: savedObjectReferences.find(ref => ref.name = 'mystate.objectId')?.id;
  }
}

const extract = (state: MyState) => {
  const references = [{ name: 'objectId', id: state.objectId, type: 'savedObject' }];
  return [{ ...state, objectId: 'mystate.objectId' }, references];
}

export const persistableStateDefinition = { migrate, inject, extract };

persistableStateService.register(MY_STATE_ID, persistableStateDefinition);
```

Persister plugin can then use the service to prepare state for saving or get it ready after loading.

```ts
  const stateReadyForPersisting = persistableStateService.get(id),beforeSave(myState);
  const stateReadyForConsuming = persistableStateService.get(id).afterLoad(await savedObjectsClient.get(...));
```

# Motivation

We need a formal way for authors of registry implementations to add migrations for this data. Since they may not own the saved object that their implementation ends up in, we can't rely on saved object migrations as it exists today (not to mention data that ends up in URLs that may need to be migrated).

We also need to make sure that all the persited state containing references to saved objects extracts those before being saved and injects them later.

# Detailed design

We plan to implement `PersistableStateRegistry ` which will be exposed under `PersitableState` plugin

```ts
export interface PersistableState extends Serializable {}

export interface PersistableStateDefinition<P extends PersistableState = PersistableState> {
  id: string,
  // migrate function receives state and version string and should return latest state version
  // default is identity function
  migrate: (state: unknown, version: string) => P,
  // inject function receives state and a list of references and should return state with references injected
  // default is identity function
  inject: (state: P, references: SavedObjectReference[]) => P,
  // extract function receives state and should return state with references extracted and array of references
  // default returns same state with empty reference array
  extract: (state: P) => { state: P, references: SavedObjectReference[] }
}

class PersistableStateRegistry {
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

Every plugin that exposes its state should register its `PersistableStateDefinition`. In this definition he needs to expose `migrate` function which can take in any state version and migrate it to the latest state as well as `inject` and `extract` functions, which should be able to inject and extract saved object references from the latest state version.

This same persitableStateDefinition should also be exposed on the plugin contract. On top of that plugin also needs to export type definition for the latest state version. Name of type definition should not include a version number but always be the same. (see the basic example)

Plugins consuming state not owned by them should always use persistableStateDefinion of the registrator plugin. When loading state they need to:

`const state = persistabelStateDefinition.inject(persistableStateDefinition.migrate(loadedState, version), references)`

and when saving state they always need to:

`const { state, references } = persistableStateDefinition.extract(runtimeState)` and store references separatly.

This way consuming plugin can always be sure that its working with the latest state version.

# Server or Client ?

Persistable state service will be available on both, server and client, under same interface. We suggest to register your persistable state definition on both client and server even if you are using just one of those as you cannot know where the consuming side is running.


# Consuming and edge cases

When plugin A wants to store some state that it does not own it should check with persistableStateRegistry for a registered persistable state definition and execute `beforeSave` function.

```ts
  const stateForSaving = persistableStateRegistry.beforeSave(id, myState);

``` 

WARNING: If state id is known at compile time we should rather import the correct utilities directly from the registrator plugin. As using the registry can hide dependencies between plugins when possible plugins should directly depend on plugins providing the state they want to store.

```ts
  import { extract } from 'src/plugins/pluginOwningState';
  const stateForSaving = extract(myState);
```

## Handling corrupt state

In current proposal handling of corrupt state is up to the implementator of PersistableStateDefinition. State incoming to migrate function could not match with version string provided so author should validate the incoming state first.

## Handling enhancements

Related github issue: https://github.com/elastic/kibana/issues/68880

The registrator needs to explicitly support enhancements. Its state should contain an `enhancement` property which is an object where every key represents a state belonging to enhancer.

Drilldown  plugin (enhancer) adds to the state of embeddable (registrator):

```ts
interface EnhancedDrilldownEmbeddableInput extends EmbeddableInput {
  enhancements: {
    drillDowns: { events?: Events[];  }
  }
}
```
Embeddable (registrator) is aware that it has an `enhancements` property on its state, where every key represents state of another plugin.

```ts
const inject = (state, references) => {
  Object.getKeys(state.enhancements).forEach(key => {
    State.enhancements[key] = persistableStateRegistry.get(key).inject(state.enhancements[key], references);
  }
}
```

And drilldown plugin registers its state with persistableStateService.

## what about state which extends some base state ?

With embeddables we currently have `SpecializedState extends BaseState` scenario. If possible don't do this but rather use the enhancements pattern described above.

Migrations can still work, but there are edgecases they can't handle. For example `embeddable-baseInput` migrator would do something like:

```ts
const migrate = (state, version) => {
  // migrate the base input properties
  
  // run the extended type migration which will migrate the rest of the properties
  return persistableStateRegistry.get(state.type).migrate(state, version);
}

```

or do it the other way around, first running the extending class migration and then the base one.

However there could be clashes using this approach due to conflicts with property names, so special care needs to be taken to not run into them. For this reason we suggest migrating towards enhancements pattern.

For example if base class has a property named `x` which it wants to migrate to `y` and extended class has a property named `y` which it wants to migrate to `z` this will only work if we do extending class migration first, the other way around we will lose information during migration.


## Use a `{pluginId}+{stateType}` pattern for your ID

To avoid clashes with other unknown plugins.

A plugin could have a single `stateType`, for example `visualizations` plugin has a `savedVis` state, so it use `visualizations-savedVis` as id. Other plugins might have multiple state types they want to register. Lets say that we introduce a new state type to `visualizations` plugin called `visState` we would use `visualizations-visState` as id.

A good example of plugin exposing multiple state types is expressions plugin, where each of the functions it registers into the registry will also register a persistable state definition.

Persistable state ID should be a const exported on plugin contract.

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

# What saved object migrations 

With saved object migrations (or any other migration of potentially high amount of state objects) currently we try to detect when a migration needs to be performed. For example if there was no change in specific saved object between minors we will not try to read or write those objects from/to elasticsearch.

With extention points to which 3rd party developers might register their own items which expose state that is not possible. For example dashboard saved object might contain state from any embeddable. As we don't know about all those embeddables we need to always fetch all saved objects and run migrations on all of them. 
If expecting to handle large amount of state objects you should always deep compare input and output state and filter out objects without changes to avoid to many updates in the database.

# Drawbacks

- teaching impact: everyone storing state from belonging to another plugin will need to remember to use this service when saving and loading state.
- this proposal uses a different pattern than the current SO migration system which is having SOs register a migration function per version, where this system has users register a single function across all versions. That means consumer doesn't care what version his state is, he can assume he will always get the latest state out of the migrate function.

# Adoption strategy

First app arch team will add persistable state definitions for saved visualizations and saved searches (vis state, search source), expressions and base embeddables. Adoption by other teams can happen gradually.

# How we teach this

If state id is known at compile time we should rather import the correct utilities directly from registrator plugin. As using the registry can hide dependencies between plugins when possible plugins should directly depend on plugins providing the state they want to store.

# Unresolved questions

