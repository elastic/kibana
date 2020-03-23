# State transitions

*State transitions* describe possible state changes over time. Transitions are pure functions which
receive `state` object and other&mdash;optional&mdash;arguments and must return a new `state` object back.

```ts
type Transition = (state: State) => (...args) => State;
```

Transitions must not mutate `state` object in-place, instead they must return a
shallow copy of it, e.g. `{ ...state }`. Example:

```ts
const setUiMode: PureTransition = state => uiMode => ({ ...state, uiMode });
```

You provide transitions as a second argument when you create your state container.

```ts
import { createStateContainer } from 'src/plugins/kibana_utils';

const container = createStateContainer(0, {
  increment: (cnt: number) => (by: number) => cnt + by,
  double: (cnt: number) => () => cnt * 2,
});
```

Now you can execute the transitions by calling them with only optional parameters (`state` is
provided to your transitions automatically).

```ts
container.transitions.increment(25);
container.transitions.increment(5);
container.state; // 30
```

Your transitions are bound to the container so you can treat each of them as a
standalone function for export.

```ts
const defaultState = {
  uiMode: 'light',
};

const container = createStateContainer(defaultState, {
  setUiMode: state => uiMode => ({ ...state, uiMode }),
  resetUiMode: state => () => ({ ...state, uiMode: defaultState.uiMode }),
});

export const {
  setUiMode,
  resetUiMode
} = container.transitions;
```

You can add TypeScript annotations for your transitions as the second generic argument
to `createStateContainer()` function.

```ts
const container = createStateContainer<MyState, MyTransitions>(defaultState, pureTransitions);
```
