# State containers

State containers are Redux-store-like objects meant to help you manage state in
your services or apps.

- State containers are strongly typed, you will get TypeScript autocompletion suggestions from
  your editor when accessing state, executing transitions and using React helpers.
- State containers can be easily hooked up with your React components.
- State containers can be used without React, too.
- State containers provide you central place where to store state, instead of spreading
  state around multiple RxJs observables, which you need to coordinate. With state
  container you can always access the latest state snapshot synchronously.
- Unlike Redux, state containers are less verbose, see example below.


## Example

```ts
import { createStateContainer } from 'src/plugins/kibana_utils';

const container = createStateContainer(0, {
  increment: (cnt: number) => (by: number) => cnt + by,
  double: (cnt: number) => () => cnt * 2,
});

container.transitions.increment(5);
container.transitions.double();
console.log(container.get()); // 10
```


## Demos

See demos [here](../../demos/state_containers/).

You can run them with

```
npx -q ts-node src/plugins/kibana_utils/demos/state_containers/counter.ts
npx -q ts-node src/plugins/kibana_utils/demos/state_containers/todomvc.ts
```


## Reference

- [Creating a state container](./creation.md).
- [State transitions](./transitions.md).
- [Using with React](./react.md).
- [Using without React`](./no_react.md).
- [Parallels with Redux](./redux.md).
