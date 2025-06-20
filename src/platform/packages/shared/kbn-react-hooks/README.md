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

### [useAbortableAsync](./src/use_abortable_async/use_abortable_async.ts)

Wrapper around async function which is called on dependency change and can be aborted via abort controller.

```tsx
  const { error, loading, value, refresh } = useAbortableAsync(
    ({ signal }) => {
      return fetch(url, { signal })
    },
    [url],
    { onError: myErrorHandler }
  );
```

### [useAbortController](./src/use_abort_controller/use_abort_controller.ts)

Hook managing an abort controller instance that aborts when it goes out of scope.

```tsx
  const { signal, abort, refresh } = useAbortController();

  // ...

  // Will be aborted when the component unmounts
  await fetch(url, { signal })
```

### [useTruncateText](.src/use_truncate_text/use_truncate_text.ts)

Hook for managing text truncation with expand/collapse functionality. Provides controlled truncation of long text content with customizable length. 

```tsx
const { displayText, isExpanded, toggleExpanded, shouldTruncate } = useTruncateText(
  longContent,
  150,          // Max length before truncation (default: 500)
  100           // Optional: Max characters to show when truncated
);

<EuiText>
  {displayText}
  {shouldTruncate && (
    <EuiLink onClick={toggleExpanded}>
      {isExpanded ? 'Show less' : 'Show more'}
    </EuiLink>
  )}
</EuiText>
```