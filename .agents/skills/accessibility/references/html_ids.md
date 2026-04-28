# HTML ID generation

## When you need an ID

Any time a fix adds `id`, `aria-labelledby`, or `titleProps.id` wiring between a label element and its target.

## Default: EUI utilities

This project uses EUI's built-in ID generators.

### Function components

Import `useGeneratedHtmlId` from `@elastic/eui`. Call it once before the first `return` and store the result in a descriptive variable.

```tsx
import { useGeneratedHtmlId } from '@elastic/eui';

const labelId = useGeneratedHtmlId();
```

### Class components

Import `htmlIdGenerator` from `@elastic/eui`. Call it inside `render()` with a stable suffix.

```tsx
import { htmlIdGenerator } from '@elastic/eui';

render() {
  const labelId = htmlIdGenerator()('myLabel');
}
```

## Variable naming

- Use descriptive names that reflect the element being identified (e.g. `modalTitleId`, `fieldLabelId`, `popoverTitleId`).
- Ensure variable names are unique within the component scope.
- Reuse an existing valid ID variable when one already targets the same element.
