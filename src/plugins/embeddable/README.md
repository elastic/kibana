# Embeddables Plugin
The Embeddables Plugin provides an opportunity to expose reusable interactive widgets that can be embedded outside the original plugin.

## Capabilities
- Framework-agnostic API.
- Out-of-the-box React support.
- Integration with Redux.
- Integration with the [UI Actions](https://github.com/elastic/kibana/tree/HEAD/src/plugins/ui_actions) plugin.
- Hierarchical structure to enclose multiple widgets.
- Error handling.

## Key Concepts
### Embeddable
Embeddable is a re-usable widget that can be rendered on a dashboard as well as in other applications.
Developers are free to embed them directly in their plugins.
End users can dynamically select an embeddable to add to a _container_.
Dashboard container powers the grid of panels on the Dashboard app.

### Container
Container is a special type of embeddable that can hold other embeddable items.
Embeddables can be added dynamically to the containers, but that should be implemented on the end plugin side.
Currently, the dashboard plugin provides such functionality.

### Input
Every embeddable has an input which is a serializable set of data.
This data can be used to update the state of the embeddable widget.
The input can be updated later so that the embeddable should be capable of reacting to those changes.

### Output
Every embeddable may expose some data to the external interface.
Usually, it is diverged from the input and not necessarily serializable.
Output data can also be updated, but that should always be done inside the embeddable.

## Usage
### Getting Started
After listing the `embeddable` plugin in your dependencies, the plugin will be intitalized on the setup stage.

The setup contract exposes a handle to register an embeddable factory.
At this point, we can provide all the dependencies needed for the widget via the factory.
```typescript
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { HELLO_WORLD } from './hello_world';
import { HelloWorldFactory } from './hello_world_factory';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

class ExamplePlugin implements Plugin<void, void, SetupDeps> {
  setup({}: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddableFactory(HELLO_WORLD, new HelloWorldFactory());
  }

  start() {}
}

export function plugin() {
  return new ExamplePlugin();
}
```

The factory should implement the `EmbeddableFactoryDefinition` interface.
At this stage, we can inject all the dependencies into the embeddable instance.
```typescript
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import { HelloWorld, HELLO_WORLD } from './hello_world';

export class HelloWorldEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  readonly type = HELLO_WORLD;

  async isEditable() {
    return true;
  }

  async create(input: EmbeddableInput, parent?: IContainer) {
    return new HelloWorld(input, {}, parent);
  }

  getDisplayName() {
    return 'Hello World';
  }
}
```


The embeddable should implement the `IEmbeddable` interface, and usually, that just extends the base class `Embeddable`.
```tsx
import React from 'react';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export const HELLO_WORLD = 'HELLO_WORLD';

export class HelloWorld extends Embeddable {
  readonly type = HELLO_WORLD;

  render() {
    return <div>{this.getTitle()}</div>;
  }

  reload() {}
}
```

### Life-Cycle Hooks
Every embeddable can implement a specific behavior for the following life-cycle stages.

#### `render`
This is a mandatory method to implement.
It is used for the initial render of the embeddable.
```tsx
import React from 'react';
import { render } from 'react-dom';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  render(node: HTMLElement) {
    render(<div>{this.getTitle()}</div>, node);
  }
}
```

There is also an option to return a [React node](https://reactjs.org/docs/react-component.html#render) directly.
In that case, the returned node will be automatically mounted and unmounted.
```tsx
import React from 'react';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  render() {
    return <div>{this.getTitle()}</div>;
  }
}
```

#### `reload`
This hook is called after every input update to perform some UI changes.
```typescript
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  private node?: HTMLElement;

  render(node: HTMLElement) {
    this.node = node;

    // ...
  }

  reload() {
    if (this.node) {
      this.render(this.node);
    }
  }
}
```

In some cases, the `reload` hook can be called to force rerender of the embeddable widget.
When the imperative rendering approach is used, the example above is good enough to achieve the goal.

In the case of React rendering, it will no longer work as the returned node is mounted on the upper level.
The recommended way is to use [Redux store](#redux) with a custom reducer.

```tsx
import React from 'react';
import { createSlice } from '@reduxjs/toolkit';
import { connect, Provider } from 'react-redux';
import { Embeddable, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { createStore, State } from '@kbn/embeddable-plugin/public/store';

interface ComponentState {
  reloadedAt?: number;
}

export interface HelloWorldState extends State<HelloWorld> {
  component: ComponentState;
}

const component = createSlice({
  name: 'hello-world-component',
  initialState: {} as ComponentState,
  reducers: {
    reload(state) {
      state.reloadedAt = new Date().getTime();
    },
  },
});

export class HelloWorld extends Embeddable {
  readonly store = createStore<HelloWorld, HelloWorldState>(this, {
    preloadedState: {
      component: {}
    },
    reducer: { component: component.reducer }
  });

  render() {
    return (
      <Provider store={this.store}>
        <Component />
      </Provider>
    );
  }

  reload() {
    this.store.dispatch(component.actions.reload());
  }
}
```

Alternatively, a [state modifier](https://reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate) can be exposed via a reference object and later called from the `reload` hook.

#### `catchError`
This is an optional error handler to provide a custom UI for the error state.

The embeddable may change its state in the future so that the error should be able to disappear.
In that case, the method should return a callback performing cleanup actions for the error UI.

If there is no implementation provided for the `catchError` hook, the embeddable will render a fallback error UI.

In case of an error, the embeddable UI will not be destroyed or unmounted.
The default behavior is to hide that visually and show the error message on top of that.

```typescript
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  catchError(error: Error, node: HTMLElement) {
    render(<div>Something went wrong: {error.message}</div>, node);

    return () => unmountComponentAtNode(node);
  }
}
```

There is also an option to return a [React node](https://reactjs.org/docs/react-component.html#render) directly.
In that case, the returned node will be automatically mounted and unmounted.
```typescript
import React from 'react';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  catchError(error: Error) {
    return <div>Something went wrong: {error.message}</div>;
  }
}
```

#### `destroy`
This hook is invoked when the embeddable is destroyed and should perform cleanup actions.
```typescript
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  render(node: HTMLElement) {
    this.node = node;

    // ...
  }

  destroy() {
    if (this.node) {
      unmountComponentAtNode(this.node);
    }
  }
}
```

### Input State
The input state can be updated throughout the lifecycle of an embeddable. That can be done via `updateInput` method call.
```typescript
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  setTitle(title: string) {
    this.updateInput({ title });
  }
}
```

The input should always be updated partially. Otherwise, it may break the inheritance of the container's input as all the values passed in the changes object have precedence over the values set on the parent container.

For example, the time range on a dashboard is _inherited_ by all children _unless_ they explicitly override their time range.
This is the way the per panel time range works. In that case, there is a call `item.updateInput({ timeRange })` that detaches the time range from the container.

### Containers
The plugin provides a way to organize a collection of embeddable widgets inside containers.
In this case, the container holds the state of all the children and manages all the input state updates.
```typescript
import { Container } from '@kbn/embeddable-plugin/public';

export class HelloWorldContainer extends Container {
  protected getInhertedInput() {
    return {
      timeRange: this.input.timeRange,
      viewMode: this.input.viewMode,
    };
  }
}
```

_Note 1:_ The `getInhertedInput` may also return values not from the input state, but it is an uncommon case.

_Note 2:_ Keep in mind that this input state will be passed down to all the children, which can be redundant in most cases.
It is better to return only necessary generic information that all children will likely consume.

### Inheritance
In the example above, all the container children will share the `timeRange` and `viewMode` properties.
If the container has other properties in the input state, they will not be shared with the children.
From the embeddable point, that works transparently, and there is no difference whether the embeddable is placed inside a container or not.

Let's take, for example, a container with the following input:
```typescript
{
  gridData: { /* ... */ },
  timeRange: 'now-15m to now',

  // Every embeddable container has a panels mapping.
  // It's how the base container class manages common changes like children being added, removed or edited.
  panels: {
    '1': {
      // The `type` is used to grab the right embeddable factory.
      // Every PanelState must specify one.
      type: 'clock',

      // The `explicitInput` is combined with the `inheritedInput`.
      explicitInput: {

        // The `explicitInput` requires to have an `id`.
        // This is needed for the embeddable to know where it stays in the panels array if it's inside a container.
        // This is not a saved object id even though it can be the same sometimes.
        id: '1',
      }
    }
  }
}
```

That could result in the following input being passed to a child embeddable:
```typescript
{
  timeRange: 'now-15m to now',
  id: '1',
}
```

#### Input Overriding
There is a way of _overriding_ this inherited state.
For example, the _inherited_ `timeRange` input can be overridden by the _explicit_ `timeRange` input.

Let's take this example dashboard container input:
```javascript
{
  gridData: { /* ... */ },
  timeRange: 'now-15m to now',
  panels: {
    ['1']: {
      type: 'clock',
      explicitInput: {
        timeRange: 'now-30m to now',
        id: '1',
      }
    },
    ['2']: {
      type: 'clock',
      explicitInput: {
        id: '2',
      }
    },
}
```

The first child embeddable will get the following state:
```javascript
{
  timeRange: 'now-30m to now',
  id: '1',
}
```

This override wouldn't affect other children, so the second child would get:
```javascript
{
  timeRange: 'now-15m to now',
  id: '2',
}
```

#### Embeddable Id
The `id` parameter in the input is marked as required even though it is only used when the embeddable is inside a container.
That is done to guarantee consistency.

This has nothing to do with a saved object id, even though in the dashboard app, the saved object happens to be the same.

#### Accessing Container
The parent container can be retrieved via either `embeddabble.parent` or `embeddable.getRoot()`.
The `getRoot` variety will walk up to find the root parent.

We can use those to get an explicit input from the child embeddable:
```typescript
  return parent.getInput().panels[embeddable.id].explicitInput;
```

#### Encapsulated Explicit Input
It is possible for a container to store an explicit input state on the embeddable side. It would be encapsulated from a container in this case.

This can ne achieved in two ways by implementing one of the following:
- `EmbeddableFactory.getExplicitInput` was intended as a way for an embeddable to retrieve input state it needs that is not provided by a container.
- `EmbeddableFactory.getDefaultInput` will provide default values, only if the container did not supply them through inheritance.
Explicit input will always provide these values, and will always be stored in a containers `panel[id].explicitInput`, even if the container _did_ provide it.

### React
The plugin provides a set of ready-to-use React components that abstract rendering of an embeddable behind a React component:

- `EmbeddablePanel` provides a way to render an embeddable inside a rectangular panel. This also provides error handling and a basic user interface over some of the embeddable properties.
- `EmbeddableChildPanel` is a higher-order component for the `EmbeddablePanel` that provides a way to render that inside a container.
- `EmbeddableRoot` is the most straightforward wrapper performing rendering of an embeddable.
- `EmbeddableRenderer` is a helper component to render an embeddable or an embeddable factory.

Apart from the React components, there is also a way to construct an embeddable object using `useEmbeddableFactory` hook.
This React hook takes care of producing an embeddable and updating its input state if passed state changes.

### Redux
The plugin provides an adapter for Redux over the embeddable state.
It uses the Redux Toolkit library underneath and works as a decorator on top of the [`configureStore`](https://redux-toolkit.js.org/api/configureStore) function.
In other words, it provides a way to use the full power of the library together with the embeddable plugin features.

The adapter implements a bi-directional sync mechanism between the embeddable instance and the Redux state.
To perform state mutations, the plugin also exposes a pre-defined state of the actions that can be extended by an additional reducer.

Here is an example of initializing a Redux store:
```tsx
import React from 'react';
import { connect, Provider } from 'react-redux';
import { Embeddable, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { createStore, State } from '@kbn/embeddable-plugin/public/store';
import { HelloWorldComponent } from './hello_world_component';

export const HELLO_WORLD = 'HELLO_WORLD';

export class HelloWorld extends Embeddable {
  readonly type = HELLO_WORLD;

  readonly store = createStore(this);

  reload() {}

  render() {
    const Component = connect((state: State<HelloWorld>) => ({ title: state.input.title }))(
      HelloWorldComponent
    );

    return (
      <Provider store={this.store}>
        <Component />
      </Provider>
    );
  }
}
```

Then inside the embedded component, it is possible to use the [`useSelector`](https://react-redux.js.org/api/hooks#useselector) and [`useDispatch`](https://react-redux.js.org/api/hooks#usedispatch) hooks.
```tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { actions, State } from '@kbn/embeddable-plugin/public/store';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { HelloWorld } from './hello_world';

interface HelloWorldComponentProps {
  title?: string;
}

export function HelloWorldComponent({ title }: HelloWorldComponentProps) {
  const viewMode = useSelector<State<HelloWorld>>(({ input }) => input.viewMode);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>{title}</h1>
      {viewMode === ViewMode.EDIT && (
        <input
          type="text"
          value={title}
          onChange={({ target }) => dispatch(actions.input.setTitle(target.value))}
        />
      )}
    </div>
  );
}
```

#### Custom Properties
The `createStore` function provides an option to pass a custom reducer in the second argument.
That reducer will be merged with the one the embeddable plugin provides.
That means there is no need to reimplement already existing actions.

```tsx
import React from 'react';
import { createSlice } from '@reduxjs/toolkit';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable
} from '@kbn/embeddable-plugin/public';
import { createStore, State } from '@kbn/embeddable-plugin/public/store';

interface HelloWorldInput extends EmbeddableInput {
  greeting?: string;
}

interface HelloWorldOutput extends EmbeddableOutput {
  message?: string;
}

const input = createSlice({
  name: 'hello-world-input',
  initialState: {} as HelloWorldInput,
  reducers: {
    setGreeting(state, action: PayloadAction<HelloWorldInput['greeting']>) {
      state.greeting = action.payload;
    },
  },
});

const output = createSlice({
  name: 'hello-world-input',
  initialState: {} as HelloWorldOutput,
  reducers: {
    setMessage(state, action: PayloadAction<HelloWorldOutput['message']>) {
      state.message = action.payload;
    },
  },
});

export const actions = {
  ...input.actions,
  ...output.actions,
};

export class HelloWorld extends Embeddable<HelloWorldInput, HelloWorldOutput> {
  readonly store = createStore(this, {
    reducer: {
      input: input.reducer,
      output: output.reducer,
    }
  });

  // ...
}
```

There is a way to provide a custom reducer that will manipulate the root state:
```typescript
// ...

import { createAction, createRducer } from '@reduxjs/toolkit';

// ...

const setGreeting = createAction<HelloWorldInput['greeting']>('greeting');
const setMessage = createAction<HelloWorldOutput['message']>('message');
const reducer = createReducer({} as State<HelloWorld>, (builder) =>
  builder
    .addCase(setGreeting, (state, action) => ({ ...state, input: { ...state.input, greeting: action.payload } }))
    .addCase(setMessage, (state, action) => ({ ...state, output: { ...state.output, message: action.payload } }))
);

export const actions = {
  setGreeting,
  setMessage,
};

export class HelloWorld extends Embeddable<HelloWorldInput, HelloWorldOutput> {
  readonly store = createStore(this, { reducer });

  // ...
}
```

#### Custom State
Sometimes, there is a need to store a custom state next to the embeddable state.
This can be achieved by passing a custom reducer.

```tsx
import React from 'react';
import { createSlice } from '@reduxjs/toolkit';
import { Embeddable, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { createStore, State } from '@kbn/embeddable-plugin/public/store';

interface ComponentState {
  foo?: string;
  bar?: string;
}

export interface HelloWorldState extends State<HelloWorld> {
  component: ComponentState;
}

const component = createSlice({
  name: 'hello-world-component',
  initialState: {} as ComponentState,
  reducers: {
    setFoo(state, action: PayloadAction<ComponentState['foo']>) {
      state.foo = action.payload;
    },
    setBar(state, action: PayloadAction<ComponentState['bar']>) {
      state.bar = action.payload;
    },
  },
});

export const { actions } = component;

export class HelloWorld extends Embeddable {
  readonly store = createStore<HelloWorld, HelloWorldState>(this, {
    preloadedState: {
      component: {
        foo: 'bar',
        bar: 'foo',
      }
    },
    reducer: { component: component.reducer }
  });

  // ...
}
```

#### Typings
When using the `useSelector` hook, it is convenient to have a `State` type to guarantee type safety and determine types implicitly.

For the state containing input and output substates only, it is enough to use a utility type `State`:
```typescript
import { useSelector } from 'react-redux';
import type { State } from '@kbn/embeddable-plugin/public/store';
import type { Embeddable } from './some_embeddable';

// ...
const title = useSelector<State<Embeddable>>((state) => state.input.title);
```

For the more complex case, the best way would be to define a state type separately:
```typescript
import { useSelector } from 'react-redux';
import type { State } from '@kbn/embeddable-plugin/public/store';
import type { Embeddable } from './some_embeddable';

interface EmbeddableState extends State<Embeddable> {
  foo?: string;
  bar?: Bar;
}

// ...
const foo = useSelector<EmbeddableState>((state) => state.foo);
```

#### Advanced Usage
In case when there is a need to enhance the produced store in some way (e.g., perform custom serialization or debugging), it is possible to use [parameters](https://redux-toolkit.js.org/api/configureStore#parameters) supported by the `configureStore` function.

In case when custom serialization is needed, that should be done using middleware. The embeddable plugin's `createStore` function does not apply any middleware, so all the synchronization job is done outside the store.

## API
Please use automatically generated API reference or generated TypeDoc comments to find the complete documentation.

## Examples
- Multiple embeddable examples are implemented and registered [here](https://github.com/elastic/kibana/tree/HEAD/examples/embeddable_examples).
- They can be played around with and explored in the [Embeddable Explorer](https://github.com/elastic/kibana/tree/HEAD/examples/embeddable_explorer) example plugin.
- There is an [example](https://github.com/elastic/kibana/tree/HEAD/examples/dashboard_embeddable_examples) of rendering a dashboard container outside the dashboard app.
- There are storybook [stories](https://github.com/elastic/kibana/tree/HEAD/src/plugins/embeddable/public/__stories__) that demonstrate usage of the embeddable components.

To run the examples plugin use the following command:
```bash
yarn start --run-examples
```

To run the storybook:
```bash
yarn storybook embeddable
```
