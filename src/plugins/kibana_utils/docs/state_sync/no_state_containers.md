# Using state syncing utilities without state containers

It is possible to use `syncState` utility even if your app not using [state containers](../state_containers).
The `state` which is passed into `syncState` function should implement following interface:

```ts
export interface BaseStateContainer<State extends BaseState> {
  get: () => State;
  set: (state: State | null) => void;
  state$: Observable<State>;
}
```

For example, assuming you have a custom state manager, setting up syncing state with url could look something like this:

```ts
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

class MyStateManager {
  private count: number = 0;

  updated$ = new Subject();

  setCount(count: number) {
    if (this.count !== count) {
      this.count = count;
      this.updated$.next();
    }
  }

  getCount() {
    return this.count;
  }
}

import { syncState, createKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';

const myStateManager = new MyStateManager();

syncState({
  get: () => ({ count: myStateManager.getCount() }),
  set: state => state && myStateManager.setCount(state.count),
  state$: myStateManager.updated$.pipe(map(() => ({ count: myStateManager.getCount() }))),
});
```
