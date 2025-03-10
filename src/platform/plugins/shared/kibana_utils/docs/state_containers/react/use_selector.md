# `useSelector()` hook

With `useSelector` React hook you specify a selector function, which will pick specific
data from the state. *Your component will update only when that specific part of the state changes.*

```tsx
const selector = state => state.isDarkMode;
const Demo = () => {
  const isDarkMode = useSelector(selector);
  return <div>{isDarkMode ? '🌑' : '☀️'}</div>;
};
```

As an optional second argument for `useSelector` you can provide a `comparator` function, which
compares currently selected value with the previous and your component will re-render only if
`comparator` returns `true`. By default it uses [`fast-deep-equal`](https://github.com/epoberezkin/fast-deep-equal).

```
useSelector(selector, comparator?)
```
