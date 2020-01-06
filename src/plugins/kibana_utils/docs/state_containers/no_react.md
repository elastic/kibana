# Consuming state in non-React setting

To read the current `state` of the store use `.get()` method.

```ts
store.get();
```

To listen for latest state changes use `.state$` observable.

```ts
store.state$.subscribe(state => { ... });
```
