# Mutators

State *mutators* are pure functions which receive `state` object and other&mdash;optional&mdash;arguments
and must return a new `state` object back.

```ts
type Mutator = (state: State) => (...args) => State;
```

Mutator must not mutate `state` object in-place, instead it should return a
shallow copy of it, e.g. `{ ...state }`.

```ts
const setUiMode: Mutator = state => uiMode => ({ ...state, uiMode });
```

You create mutators using `.createMutator(...)` method.

```ts
const store = createStore({uiMode: 'light'});
const mutators = store.createMutators({
  setUiMode: state => uiMode => ({ ...state, uiMode }),
});
```

Now you can use your mutators by calling them with only optional parameters (`state` is
provided to your mutator automatically).

```ts
mutators.setUiMode('dark');
```

Your mutators are bound to the `store` so you can treat each of them as a
standalone function for export.

```ts
const { setUiMode, resetUiMode } = store.createMutators({
  setUiMode: state => uiMode => ({ ...state, uiMode }),
  resetUiMode: state => () => ({ ...state, uiMode: 'light' }),
});

export {
  setUiMode,
  resetUiMode,
};
```

The mutators you create are also available on the `store` object.

```ts
const store = createStore({ cnt: 0 });
store.createMutators({
  add: state => value => ({ ...state, cnt: state.cnt + value }),
});

store.mutators.add(5);
store.get(); // { cnt: 5 }
```

You can add TypeScript annotations to your `.mutators` property of `store` object.

```ts
const store = createStore<{
  cnt: number;
}, {
  add: (value: number) => void;
}>({
  cnt: 0
});
```
