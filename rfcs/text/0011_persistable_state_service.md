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

interface MyStateV77 extends Serializable {
  objectId: string,
  val: number,
}

interface MyState extends Serializable {
  objectId: string,
  value: number,
}

const migrate = (state: MyState, version: number) => {
  let newState: MyState,
  if (version < 7.8) {
    const oldState = state as MyStateV77;
    newState = { objectId: oldState.objectId, value: oldState.val };
  } else {
    newState = state;
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

...

# Drawbacks

- teaching impact: everyone storing state from belonging to another plugin will need to remember to use this service when saving and loading state. 

# Alternatives

Instead of having a central registry we could have each plugin export functions for migration, reference extraction and reference injection.
Plugin consuming its state would need to import them from correct place.

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