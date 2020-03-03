# React

`createStateContainerReactHelpers` factory allows you to easily use state containers with React.


## Example


```ts
import { createStateContainer, createStateContainerReactHelpers } from 'src/plugins/kibana_utils';

const container = createStateContainer({});
export const {
  Provider,
  Consumer,
  context,
  useContainer,
  useState,
  useTransitions,
  useSelector,
  connect,
} = createStateContainerReactHelpers<typeof container>();
```

Wrap your app with `<Provider>`.

```tsx
<Provider value={container}>
  <MyApplication />
</Provider>
```


## Reference

- [`useContainer()`](./react/use_container.md)
- [`useState()`](./react/use_state.md)
- [`useSelector()`](./react/use_selector.md)
- [`useTransitions()`](./react/use_transitions.md)
- [`connect()()`](./react/connect.md)
- [Context](./react/context.md)
