# `useContainer` hook

`useContainer` React hook will simply return you `container` object from React context.

```tsx
const Demo = () => {
  const store = useContainer();
  return <div>{store.get().isDarkMode ? '🌑' : '☀️'}</div>;
};
```
