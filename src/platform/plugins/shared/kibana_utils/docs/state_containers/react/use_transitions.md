# `useTransitions` hook

Access [state transitions](../transitions.md) by `useTransitions` React hook.

```tsx
const Demo = () => {
  const { isDarkMode } = useState();
  const { setDarkMode } = useTransitions();
  return (
    <>
      <div>{isDarkMode ? '🌑' : '☀️'}</div>
      <button onClick={() => setDarkMode(true)}>Go dark</button>
      <button onClick={() => setDarkMode(false)}>Go light</button>
    </>
  );
};
```
