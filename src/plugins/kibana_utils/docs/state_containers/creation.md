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

Create default state of your container.

```ts
const defaultState: MyState = {
  uiMode: 'dark',
  isPanelOpen: false,
  users: {},
};
```

Create your a state container.

```ts
import { createStateContainer } from 'src/plugins/kibana_utils';

const container = createStateContainer<MyState>(defaultState, {});

console.log(container.get());
```
