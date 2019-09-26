# Creating a *state container*

Create a TypeScript annotation of your state shape.

```ts
interface MySavedObject {
  id: string;
  name: string;
}

interface MyState {
  uiMode: 'dark' | 'light';
  isPanelOpen: boolean;
  users: {
    [id: string]: MySavedObject;
  };
}
```

Create default state of your *store*.

```ts
const defaultState: MyState = {
  uiMode: 'dark',
  isPanelOpen: false,
  users: {},
};
```

Create your state container, i.e *store*.

```ts
import { createStore } from 'kibana-utils';

const store = createStore<MyState>(defaultState);
console.log(store.get());
```

> ##### N.B.
> 
> State must always be an object `{}`.
> 
> You cannot create a store out of an array, e.g ~~`createStore([])`~~.
