# @kbn/react-hooks

A utility package, `@kbn/react-hooks`, provides custom react hooks for simple abstractions.

## Custom Hooks

### [useBoolean](./src/use_boolean/use_boolean.ts)

Simplify handling boolean value with predefined handlers.

```tsx
function App() {
  const [value, { on, off, toggle }] = useBoolean();

  return (
    <div>
      <EuiText>
        The current value is <strong>{value.toString().toUpperCase()}</strong>
      </EuiText>
      <EuiFlexGroup>
        <EuiButton onClick={on}>On</EuiButton>
        <EuiButton onClick={off}>Off</EuiButton>
        <EuiButton onClick={toggle}>Toggle</EuiButton>
      </EuiFlexGroup>
    </div>
  );
}
```

### [useErrorTextStyle](./src/use_error_text_style/use_error_text_style.ts)

Returns styles used for styling error text.

```tsx
function App() {
  const errorTextStyle = useErrorTextStyle();

  return (
    <div>
      <EuiText css={errorTextStyle}>Error message</EuiText>
    </div>
  );
}
```
