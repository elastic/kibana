# Testbed utils

The Testbed is a small library to help testing React components. It is most useful when testing application "sections" (or pages) in **integration** 
than when unit testing single components in isolation.

## Motivation

The Elasticsearch UI team built this to support client-side integration testing. When testing complete "pages"  we get to test 
our application in a way that is closer to how a user would interact with it in a browser. It also gives us more confidence in 
our tests and avoids testing implementation details. 

We test everything up to the HTTP Requests made from the client to the Node.js API server. Those requests need to be mocked. This means that with a good 
**API integration test** coverage of those  endpoints, we can reduce the functional tests to a minimum.

With this in mind, we needed a way to easily mount a component on a React Router `<Route>` (this component could possibily have _child_ routes and 
need access to the browser URL parameters and query params). In order to solve that, the Testbed wraps the component around a `MemoryRouter`.

On the other side, the majority of our current applications use Redux as state management so we needed a simple way to wrap our component under test 
inside a redux store provider.

## How to use it

At the top of your test file (you only need to declare it once), register a new Testbed by providing a React Component and an optional configuration object. 
You receive in return a function that you need to call to mount the component in your test.

**Example 1**

```ts
// remote_clusters_list.helpers.ts

import { registerTestBed } from '../../../../test_utils';
import { RemoteClusterList } from '../../app/sections/remote_cluster_list';
import { remoteClustersStore } from '../../app/store';
import routing from '../../app/services/routing';

const config = {
  memoryRouter: {
    onRouter(router) {
      routing.registerRouter(router); // send the router instance to the routing service
    },
    initialEntries: ['/some-resource-name'], // the Router initial URL
    componentRoutePath: '/:name' // the Component <Route /> path
  },
  store: remoteClusterStore
};

export const setup = registerTestBed(RemoteClusterList, config);
```

Once you have registered a TestBed, you can call the `setup()` function to mount the component in your tests. You will get an object 
back with a set of utility methods to test the component (refer to the documentation below for a complete list of the methods available).

```ts
// remote_cluster.test.ts

import { setup } from './remote_clusters_list.helpers.ts';

describe('<RemoteClusterList />', () => {
  test('it should have a table with 3 rows', () => {
    const { component, exists, find } = setup();

    // component is an Enzyme reactWrapper
    console.log(component.debug());
  
    expect(exists('remoteClusterTable')).toBe(true);
    expect(find('remoteClusterTable.row').length).toBe(3);
  });
});
```

## Test subjects

The Testbed utils are meant to be used with test subjects. Test subjects are elements that are tagged specifically for selecting from tests. Use test subjects over CSS selectors when possible.

```html
<div id="container”>
  <CustomButton id="clickMe” data-test-subj=”containerButton” />
</div>
```

```ts
find('containerButton').simulate('click');
```

If you need to access a CSS selector, target first the closest test subject.

```ts
const text = find('containerButton').find('.link--active').text();
```

## Typescript

If you use Typescript, you can provide a string union type for your test subjects and you will get **autocomplete** on the test subjects in your test. To automate finding all the subjects on the page, use the Chrome extension below.

```ts
type TestSubjects = 'indicesTable' | 'createIndexButton' | 'pageTitle';

export const setup = registerTestBed<TestSubjects>(MyComponent);
```

## Best practices

In order to prevent flakiness in component integration tests, please consider the following best practices: 

- **Use** `jest.useFakeTimers()`.
  
  The code under a test might be using `setTimeout()` calls. This is bad for deterministic tests. In order to avoid it, we need to use mocked timers from jest. For that we declare at the top of each component integration test the following:
​
  ```js
  beforeAll(() => {
    jest.useFakeTimers();
  });
  ​
  afterAll(() => {
    jest.useRealTimers();
  });
  ```

- **Do not use** using `nextTick()` helper in tests. This helper use `setTimeout` underneath and add latency in the tests, especially on CI where a timeout (even of a few ms) can trigger a timeout error.

- **Do not declare** `component.update()` inside `act()`. Each `act()` call should contain a chunk of actions that updates the internal state(s). The `component.update()` that re-renders the internal DOM needs to be called outside, before asserting against the updated DOM.

- Be **synchronous** as much as possible.
​
  Hooks are delicate when it comes to state updates. Sometimes calling `act()` synchronously works, sometimes it doesn't. The reasoning behind this isn't clear yet. The best approach is to try synchronously first and if it fails, because of an `act()` error, then use the async version.

  ```js
  // First try this
  act(() => {
    find('someTestSubject').simulate('click');
  });
  component.update();
  ​
  // If there is a "missing `act()` error", then change it to
  await act(async () => {
    find('someTestSubject').simulate('click');
  });
  component.update();
  ```

## API

## `registerTestBed(Component [, testBedConfig])`

Instantiate a new TestBed to test a React component. The arguments it receives are

- `Component` (the React component to test)
- `testBedConfig` (optional). An optional Testbed configuration object.

**@returns** A function to instantiate and mount the component.

### `testBedConfig`

The `testBedConfig` has the following properties (all **optional**)

- `defaultProps` The default props to pass to the mounted component. Those props can be overriden when calling the `setup([props])` callback
- `memoryRouter` Configuration object for the react-router `MemoryRouter` with the following properties
  - `wrapComponent` Flag to provide or not a `MemoryRouter`. If set to `false`, there won't be any router and the component won't be added on a `<Route />`. (default: `true`)
  - `initialEntries` The React Router **initial entries** setting. (default: `['/']`. [see doc](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/MemoryRouter.md))
  - `initialIndex` The React Router **initial index** setting (default: `0`)
  - `componentRoutePath` The route **path** for the mounted component (default: `"/"`)
  - `onRouter` A callback that will be called with the React Router instance when the component is mounted
- `store` A redux store. You can also provide a function that returns a store. (default: `null`)


## `setup([props])`

When registering a Testbed, you receive in return a setup function. This function accepts one optional argument:

- `props` (optional) Props to pass to the mounted component.

```js
describe('<RemoteClusterList />', () => {
  test('it should be green', () => {
    // Will mount <RemoteClusterList color="green" />
    const { component } = setup({ color: 'green' });
    ...
  });
});
```

**@returns** An object with the following **properties** and **helpers** for testing

#### `component`

The mounted component. It is an enzyme **reactWrapper**.

#### `exists(testSubject)`

Pass it a `data-test-subj` and it will return true if it exists or false if it does not exist. You can provide a nested path to access the
test subject by separating the parent and child with a dot (e.g. `myForm.followerIndexName`).

```js
const { exists } = setup();
expect(exists('myTestSubject')).toBe(true);
```

#### `find(testDataSubject)`

Pass it a `data-test-subj` and it will return an Enzyme reactWrapper of the node. You can provide a nested path to access the
test subject by separating the parent and child with a dot (e.g. `myForm.followerIndexName`).

```js
const { find } = setup();

const someNode = find('myTestSubject');
expect(someNode.text()).toBe('hello');
```

#### `setProps(props)`

Update the props passed to a component.

**Important**: This method can only be used on a Component that is _not_ wrapped by a `<Route />`.

```js
...

const { setup } = registerTestBed(RemoteClusterList);

describe('<RemoteClusterList />', () => {

  test('it should work', () => {
    const { exists, find, setProps } = setup();
    // test logic...

    // update the props of the component
    setProps({ color: 'yellow' });
    ...
  });
});
```

#### `table`

An object with the following methods:

##### `getMetaData(testSubject)`

Parse an EUI table and return metadata information about its rows and columns. You can provide a nested path to access the
test subject by separating the parent and child with a dot (e.g. `mySection.myTable`). It returns an object with two properties:

- `tableCellsValues` a two dimensional array of rows + columns with the text content of each cell of the table
- `rows` an array of row objects. A row object has the following two properties:
  - `reactWrapper` the Enzyme react wrapper of the `tr` element.
  - `columns` an array of columns objects. A column object has two properties:
    - `reactWrapper` the Enzyme react wrapper for the table row `td`
    - `value` the text content of the table cell

```html
<table data-test-subj="myTable">
  <tr>
    <td>Row 0, column 0</td>
    <td>Row 0, column 1</td>
  </tr>
  <tr>
    <td>Row 1, column 0</td>
    <td>Row 1, column 1</td>
  </tr>
</table>
```

```js
const { table: { getMetaData } } = setup();
const { tableCellsValues } = getMetaData('myTable');

expect(tableCellsValues).toEqual([
  ['Row 0, column 0'], ['Row 0, column 1'],
  ['Row 1, column 0'], ['Row 1, column 1'],
]);
```

#### `form`

An object with the following methods:

##### `setInputValue(input, value)`

Set the value of a form input. The input can either be a test subject (a string) or an Enzyme react wrapper. If you specify a test subject, 
you can provide a nested path to access it by separating the parent and child with a dot (e.g. `myForm.followerIndexName`).

```js
await form.setInputValue('myInput', 'some value', true);
```

##### `selectCheckBox(testSubject)`

Select a form checkbox.

##### `toggleEuiSwitch(testSubject)`

Toggle an Eui Switch.

##### `setComboBoxValue(testSubject, value)`

The EUI `<EuiComboBox />` component is special in the sense that it needs the keyboard ENTER key to be pressed
in order to register the value provided. This helper takes care of that.

##### `getErrorsMessages()`

Find all the DOM nodes with the `.euiFormErrorText` css class from EUI and return an Array with its text content.

#### `router`

An object with the following methods:

##### `navigateTo(url)`

If you need to navigate to a different route inside your test and you are not using the `<Link />` component from `react-router`
in your component, you need to use the `router.navigateTo()` method from the testBed in order to trigger the route change on the `MemoryRouter`.
