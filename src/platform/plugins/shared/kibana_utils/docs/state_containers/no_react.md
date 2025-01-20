# Consuming state in non-React setting

To read the current `state` of the store use `.get()` method or `getState()` alias method.

```ts
stateContainer.get();
```

To listen for latest state changes use `.state$` observable.

```ts
stateContainer.state$.subscribe(state => { ... });
```
