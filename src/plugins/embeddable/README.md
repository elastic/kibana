# Embeddables Plugin
The Embeddables Plugin provides an opportunity to expose reusable interactive widgets that can be embedded outside the original plugin.

## Capabilities
- Framework-agnostic API.
- Out-of-the-box React support.
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
import { render } from 'react-dom';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export const HELLO_WORLD = 'HELLO_WORLD';

export class HelloWorld extends Embeddable {
  readonly type = HELLO_WORLD;

  render(node: HTMLElement) {
    render(<div>{this.getTitle()}</div>, node);
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

#### `renderError`
This is an optional error handler to provide a custom UI for the error state.

The embeddable may change its state in the future so that the error should be able to disappear.
In that case, the method should return a callback performing cleanup actions for the error UI.

If there is no implementation provided for the `renderError` hook, the embeddable will render a fallback error UI.

In case of an error, the embeddable UI will not be destroyed or unmounted.
The default behavior is to hide that visually and show the error message on top of that.

```typescript
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Embeddable } from '@kbn/embeddable-plugin/public';

export class HelloWorld extends Embeddable {
  // ...

  renderError(node: HTMLElement, error: Error) {
    render(<div>Something went wrong: {error.message}</div>, node);

    return () => unmountComponentAtNode(node);
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
