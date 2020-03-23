# `useState()` hook

- `useState` hook returns you directly the state of the container.
- It also forces component to re-render every time state changes.

```tsx
const Demo = () => {
  const { isDarkMode } = useState();
  return <div>{isDarkMode ? '🌑' : '☀️'}</div>;
};
```
