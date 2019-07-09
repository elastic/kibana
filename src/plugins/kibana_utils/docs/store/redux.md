# Redux

Internally `createStore()` uses Redux to manage the state. When you call `store.get()`
it is actually calling the Redux `.getState()` method. When you execute a mutation
it is actually dispatching a Redux action.

You can access Redux *store* using `.redux`.

```ts
store.redux;
```

But you should never need it, if you think you do, consult with Kibana App Architecture team.

We use Redux internally for 3 main reasons:

- We can reuse `react-redux` library to easily connect state containers to React.
- We can reuse Redux devtools.
- We can reuse battle-tested Redux library and action/reducer paradigm.
