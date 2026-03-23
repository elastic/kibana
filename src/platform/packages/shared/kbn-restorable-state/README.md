# @kbn/restorable-state

This package provides a set of utilities for managing and restoring the subcomponents state in a centralized way.

In order to use this package:

1. Define a state interface which would include all the tracked subcomponent states and create utils tailored to your state interface
```typescript
import { createRestorableStateProvider } from '@kbn/restorable-state';

export interface MyRestorableState {
  count: number;
}

export const { withRestorableState, useRestorableState } =
  createRestorableStateProvider<MyRestorableState>();
```

2. Wrap your component with the `withRestorableState` HOC and use the `useRestorableState` instead of the usual `useState`.

```typescript
import { withRestorableState, useRestorableState } from '../path/to/your/restorable-state-utils';

interface InternalMyComponentProps {
  // your component props here
}

const InternalMyComponent: React.FC<InternalMyComponentProps> = () => {
  const [count, setCount] = useRestorableState('count', 0);

  return (
    <div>
      <button onClick={() => setCount(value => value + 1)}>Increment</button>
      <p>Count: {count}</p>
    </div>
  );
}

export const MyComponent = withRestorableState(InternalMyComponent);

// props are now extended with initialState and onInitialStateChange
export type MyComponentProps = ComponentProps<typeof MyComponent>;
```

3. Use the `MyComponent` in your application. The state will be automatically restored when the component is mounted again.

```typescript
import { MyComponent } from '../path/to/your/my_component';

const App = () => {
  return (
    <MyComponent 
      // This component will now accept 2 more props
      initialState={/* initialState */} // Initial state for the subcomponents
      onInitialStateChange={(newState) => { // A callback to keep track of subcomponents state changes
        console.log('Initial state changed:', newState);
      }}
    />
  );
}
```