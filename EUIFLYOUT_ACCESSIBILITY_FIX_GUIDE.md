# EuiFlyout Accessibility - Quick Reference Guide

## The Problem

All `<EuiFlyout>` components must have either an `aria-label` or `aria-labelledby` prop for accessibility. Screen readers need these attributes to properly announce flyout content to users.

## ESLint Rule

```
EuiFlyout must have either 'aria-label' or 'aria-labelledby' prop for accessibility.
```

## ❌ Incorrect Implementation

```tsx
// Missing accessibility prop - VIOLATION
<EuiFlyout onClose={onClose}>
  <EuiFlyoutHeader>
    <EuiTitle>
      <h2>My Flyout Title</h2>
    </EuiTitle>
  </EuiFlyoutHeader>
  <EuiFlyoutBody>
    {/* content */}
  </EuiFlyoutBody>
</EuiFlyout>
```

## ✅ Correct Implementation (Preferred Method)

### Using aria-labelledby (Recommended)

This is the preferred approach as it links the flyout to an existing title element:

```tsx
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';

export const MyComponent = () => {
  const flyoutTitleId = useGeneratedHtmlId();
  
  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>My Flyout Title</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* content */}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
```

### Using aria-labelledby with prefix (Optional)

You can provide a prefix for better debugging:

```tsx
const flyoutTitleId = useGeneratedHtmlId({ prefix: 'myFlyout' });
```

## ✅ Alternative: Using aria-label

When there's no visible title element to reference:

```tsx
<EuiFlyout 
  onClose={onClose} 
  aria-label="Configuration settings"
>
  <EuiFlyoutBody>
    {/* content without a title */}
  </EuiFlyoutBody>
</EuiFlyout>
```

## Examples from Kibana Codebase

### Correct Example 1: File Management Flyout

From: `src/platform/plugins/private/files_management/public/components/file_flyout.tsx`

```tsx
export const FileFlyout: FunctionComponent<Props> = ({ onClose, file }) => {
  const { filesClient } = useFilesManagementContext();
  const titleId = useGeneratedHtmlId({
    prefix: 'fileFlyout',
  });
  
  return (
    <EuiFlyout ownFocus onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{file.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* ... */}
    </EuiFlyout>
  );
};
```

### Correct Example 2: Details Flyout

From: `examples/files_example/public/components/details_flyout.tsx`

```tsx
export const DetailsFlyout: FunctionComponent<Props> = ({ files, file, onDismiss }) => {
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout onClose={onDismiss} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>{file.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* ... */}
    </EuiFlyout>
  );
};
```

## Key Steps to Fix Violations

1. **Import the hook**: Add `useGeneratedHtmlId` to your imports from `@elastic/eui`

   ```tsx
   import { useGeneratedHtmlId } from '@elastic/eui';
   ```

2. **Generate a unique ID**: Call the hook in your component

   ```tsx
   const flyoutTitleId = useGeneratedHtmlId();
   ```

3. **Add aria-labelledby**: Add the prop to your `<EuiFlyout>` component

   ```tsx
   <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
   ```

4. **Link to title element**: Add the `id` attribute to your title element

   ```tsx
   <h2 id={flyoutTitleId}>Your Title</h2>
   ```

## When to Use Each Method

| Situation | Method | Example |
|-----------|--------|---------|
| Flyout has a visible title | `aria-labelledby` | Most flyouts with headers |
| Flyout has no title but descriptive content | `aria-label` | Simple confirmation dialogs |
| Dynamic flyout content | `aria-labelledby` | User-specific or data-driven titles |
| Reusable flyout component | `aria-labelledby` | Allow callers to customize the title |

## Additional Resources

- [EUI Flyout Documentation](https://elastic.github.io/eui/#/layout/flyout)
- [ARIA: aria-labelledby attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-labelledby)
- [ARIA: aria-label attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label)

## Notes

- Always prefer `aria-labelledby` over `aria-label` when a visible title exists
- The `useGeneratedHtmlId` hook ensures unique IDs even when multiple flyouts are present
- Screen readers will announce the linked title when the flyout opens
- This fix improves accessibility for users who rely on assistive technologies
