# React context

`createStateContainerReactHelpers` returns `<Provider>` and `<Consumer>` components
as well as `context` React context object.

```ts
export const {
  Provider,
  Consumer,
  context,
} = createStateContainerReactHelpers<typeof container>();
```

`<Provider>` and `<Consumer>` are just regular React context components.

```tsx
<Provider value={container}>
  <div>
    <Consumer>{container =>
      <pre>{JSON.stringify(container.get())}</pre>
    }</Consumer>
  </div>
</Provider>
```
