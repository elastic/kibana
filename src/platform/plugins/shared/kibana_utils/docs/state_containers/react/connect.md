# `connect()()` higher order component

Use `connect()()` higher-order-component to inject props from state into your component.

```tsx
interface Props {
  name: string;
  punctuation: '.' | ',' | '!',
}
const Demo: React.FC<Props> = ({ name, punctuation }) =>
  <div>Hello, {name}{punctuation}</div>;

const store = createStateContainer({ userName: 'John' });
const { Provider, connect } = createStateContainerReactHelpers(store);

const mapStateToProps = ({ userName }) => ({ name: userName });
const DemoConnected = connect<Props, 'name'>(mapStateToProps)(Demo);

<Provider>
  <DemoConnected punctuation="!" />
</Provider>
```
