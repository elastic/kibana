# Tight Coupling in Kibana

## Problems

It is quite common for plugins to tightly couple their implementations to APIs exposed from Core or shared Plugins (eg. `data` plugin). Often these APIs are passed down deeply into UI trees. This creates a number of issues:

- Introducing or adapting to breaking changes is difficult
- Coupled code is less reusable & hard to move around
- Test setup is difficult, most likely leading to poorer test coverage

A quick example:
```tsx
// From SIEM app
const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;
```

Common code smells that indicate tight coupling:

- Using SavedObjectsClient directly in a UI component
- Accessing Core or Plugin APIs in 3+ components deep in a UI tree
- Using `core.http.fetch` directly in a UI component

## Solutions

- Plugins can take incremental steps towards an ideal state, getting benefits along the way
- Where decoupling is the most impactful:
    - Shared components which depend on Core services (eg. data, `<CodeEditor />`)
    - Very large UI trees (eg. Canvas, APM)
    - Large complex backend services (eg. Alerting, Ingest Package Manager)
- Steps towards perfection:
    1. Consolidate dependency access
    2. Isolate to only the parts of the dependency that are needed
    3. Encapsulate dependencies with usage-specific abstractions
    4. Use mocks of the usage-specific abstractions in tests

## Steps towards perfection

### Consolidate dependency access

It is beneficial to have a single pattern for accessing dependencies. Having a single way to do things within a plugin greatly helps tracking down where things come from and makes mocking these dependencies simpler.

Examples:

- Move all dependencies into a single React context that can be easily mocked
- Move all dependencies into a single React hook
- Move all dependencies into a stateful module that can be initialized with mocks

### Isolate to only the parts of a dependency that are needed

Some Core and plugin APIs are quite large and it's often the case that plugins only really depend on some subset of functionality. It can simplify testing and mocking quite a bit if the code is refactored to only depend on the required bits of its dependencies.

```tsx
interface MyStartDependencies {
  core: CoreStart;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart
}
```

```tsx
interface MyStartDependencies {
  savedObjectsClient: CoreStart['savedObjects']['client'];
  getUiSetting$: CoreStart['uiSettings']['client']['get$'];
  getIndexPatterns: DataPublicPluginStart['indexPatterns']['get'];
  expressionLoader: ExpresionsStart['loader'];
}
```

### Create usage-specific abstractions

This is the most labor-intensive step, but also the most beneficial. We can greatly reduce coupling by encapsulating the API of our dependencies under an abstraction that is specific to our plugin's usage of that dependency.

For example, instead of having UI components directly depend on entire the SavedObjectsClient API, we can create a specialized abstraction like `updateWorkpad` that can be more exhaustively tested in one place, and then easily mocked when testing components that depend on it.

#### Tightly coupled
```tsx
const SaveButton = ({ onSave }) => {
  // useKibana exposes the entire Core API, encouraging tight coupling
  const { savedObjects, notifications } = useKibana();

  // This callback has a lot of code, all of which needs to be tested
  // in this component's unit tests.
  const save = useCallback(async () => {
    try {
      const res = await savedObjects.client.update(
        WORKPAD_TYPE, 
        { ...attrs }
      );
      onSave(res.attributes);
    } catch (e) {
      // complex error handling code
      if (e.type === "NOT FOUND") {
        // ...
      } else {
        notifications.toasts.addError(e);
      }
    }
  }

  return (
    <EuiButton onClick={save}>Save</EuiButton>
  )
}
```

#### Decoupled using a usage-specific abstraction

First we define our vanilla JS service that abstracts away the SavedObjects and Toasts integrations:
```ts
import { IToasts } from 'src/core/public';

interface WorkpadAttributes {
  title: string;
  pages: WorkpadPage[];
}

type Workpad = SavedObject<WorkpadAttributes>;

/** Vanilla JS service */
export const updateWorkpadFactory = (savedObjectClient: SavedObjectClient, toasts: IToasts) =>
  (id: string, attributes: Partial<WorkpadAttributes>): Promise<Workpad> => {
    try {
      const { attributes: updatedAttributes } = await savedObjects.client.update(
        WORKPAD_TYPE, 
        { ...attrs }
      );
      return {
        id,
        attributes: updatedAttributes
      }
    } catch (e) {
      // complex error handling code
      if (e.type === "NOT FOUND") {
        // ...
      } else {
        notifications.toasts.addError(e);
      }
    }
  };

export type UpdateWorkpad = ReturnType<typeof updateWorkpadFactory>;
```

To make accessing these services convenient, we can create a React Context for usage without our application:
```ts
/** Interface for describe services */
interface CanvasServices {
  updateWorkpad: UpdateWorkpad;
}

/** Factory function for wiring up services to Core */
const createCanvasServices = (core: CoreStart): CanvasServices => ({
  updateWorkpad: updateWorkpadFactory(core.savedObjects.client, core.notifications.toasts)
});

/** Context for accessing services for convenience. */
const CanvasContext = React.createContext<CanvasServices>();

export const useCanvasServices = () => React.useContext(CanvasContext);
```

We then use this context when rendering our application:
```tsx
core.application.register({
  id: 'canvas',
  async mount({ element }) {
    const [coreStart] = await core.getStartServices();
    ReactDOM.render(
      <CanvasContext.Provider value={createCanvasServices(coreStart)}>
        <CanvasApp />
      </CanvasContext.Provider>,
      element
    );
  }
})
```

In our leaf components, we can grab access to these abstractions via the `useCanvasServices` hook:
```tsx
import { useCanvasServices } from '../../hooks';

const SaveButton = ({ onSave }) => {
  // useCanvasServices could expose a smaller set of canvas-specific abstractions
  const { updateWorkpad } = useCanvasServices();
	// This callback is much smaller, only requires that we test that updateWorkpad
  // is called with the expected arguments.
  const save = useCallback(async () => {
    // Error handling encapsulated by `updateWorkpad`, displays toast on error
    const workpad = await updateWorkpad(id, { ...attrs });
    onSave(workpad);
  }

  return (
    <EuiButton onClick={save}>Save</EuiButton>
  )
}
```

When testing the leaf components we only need to mock our abstractions, rather than the entire Core API. Now the Core API can be easily changed without this test being affected at all.
```tsx
import { mount } from 'enzyme';

const mockCanvasServices: MockedKeys<CanvasServices> = {
  updateWorkpad: jest.fn()
};

const onSaveMock = jest.fn();

mount(
  <CanvasContext.Provider value={mockCanvasServices}>
    <SaveButton onSave={onSaveMock} />
  </CanvasContext.Provider>
)
```

If Core needs to introduce a breaking change to the `SavedObjectsClient#update` method, we only have to update the Canvas plugin in a single place, rather than in every component that writes updates to Workpads. This change also makes the component code much easier to grok and understand quickly. Building reusable abstractions like this speeds up development while also encouraging more thorough test coverage.

All of these benefits also apply to Plugin APIs. Abstractions over any of dependencies allow those dependencies to change without breaking nearly as much UI code.

How these abstractions are built and where they live is up to each plugin. Ideally, the abstractions are quite generic and implemented with vanilla TypeScript. To make accessing these abstractions simple, there are a few options:
- React Hooks
- React Context
- Redux action creators (or similar)

### Use mocks of the usage-specific abstractions in tests

Once you are using usage-specific abstractions, you can more easily mock out dependencies by providing mocks that only implement the simplified API of your abstraction. This allows you to easily test components or even use entire UI trees outside of Kibana (such as Storybook)

```tsx
const updateWorkpadMock = jest.fn();

jest.mock('../../hooks', () => ({
  useCanvasServices: () => ({
    updateWorkpad: updateWorkpadMock,
  })
}));
```

# Related Links

- [[discuss] Direct dependency on NP code in low-level components...?](https://github.com/elastic/kibana/issues/53029)