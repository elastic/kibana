# @kbn/split-button

Reusable split button UI component for Kibana interfaces. This package provides a customizable split button component with primary and secondary actions, built on top of Elastic UI components.

## Overview

The `@kbn/split-button` package provides a split button React component that combines a primary action button with a secondary action button. This pattern is useful for interfaces where users need quick access to a primary action while having additional options readily available.

## Package Details

- **Package Type**: `private` (platform internal)
- **Visibility**: Private to platform packages
- **Dependencies**: `@elastic/eui`, `@kbn/css-utils`, `react`
- **Storybook**: Includes comprehensive component stories

## Core Component

### SplitButton Component
A composite button component that renders a primary action button alongside a secondary action button with configurable styling and behavior.

#### Props Interface
```typescript
type SplitButtonProps = React.ComponentProps<typeof EuiButton> & {
  // Loading states
  isMainButtonLoading?: boolean;
  isSecondaryButtonLoading?: boolean;
  
  // Secondary button configuration
  secondaryButtonIcon: string;
  secondaryButtonAriaLabel?: string;
  onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
  
  // Display options
  iconOnly?: boolean;
};
```

## Usage Examples

### Basic Split Button
```typescript
import { SplitButton } from '@kbn/split-button';

function MyComponent() {
  return (
    <SplitButton
      onClick={handlePrimaryAction}
      onSecondaryButtonClick={handleSecondaryAction}
      secondaryButtonIcon="arrowDown"
      secondaryButtonAriaLabel="Show more options"
    >
      Save Document
    </SplitButton>
  );
}
```

### With Loading States
```typescript
<SplitButton
  isMainButtonLoading={isSaving}
  isSecondaryButtonLoading={isProcessing}
  onClick={handleSave}
  onSecondaryButtonClick={handleOptions}
  secondaryButtonIcon="gear"
  secondaryButtonAriaLabel="Document options"
  disabled={!canSave}
>
  {isSaving ? 'Saving...' : 'Save'}
</SplitButton>
```

### Icon-Only Mode
```typescript
<SplitButton
  iconOnly
  iconType="save"
  onClick={handleQuickSave}
  onSecondaryButtonClick={handleSaveOptions}
  secondaryButtonIcon="arrowDown"
  secondaryButtonAriaLabel="Save options"
  size="s"
  color="primary"
/>
```

### Different Color Schemes
```typescript
// Primary action
<SplitButton color="primary" {...props}>Primary Action</SplitButton>

// Success action  
<SplitButton color="success" {...props}>Success Action</SplitButton>

// Text/minimal style
<SplitButton color="text" {...props}>Text Action</SplitButton>
```

## Styling Features

### Dynamic Border Handling
The component automatically adjusts border styling based on the color prop, providing transparent borders for non-text colors and standard borders for text variants.

### EUI Theme Integration
Uses Elastic UI's theming system for consistent styling that adapts to light/dark themes automatically.

### CSS-in-JS Styling
Leverages `@kbn/css-utils` for optimized CSS-in-JS styling with memoization for performance.

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for both button actions
- **ARIA Labels**: Configurable aria labels for screen reader support
- **Focus Management**: Proper focus indicators and navigation
- **Loading States**: Clear loading indicators with appropriate aria attributes

## Development Features

### Storybook Integration
Comprehensive Storybook stories demonstrate all component variations and use cases, making it easy for developers to understand implementation patterns.

### TypeScript Support
Full TypeScript definitions with proper type inference and IDE autocompletion support.

### Testing
Includes comprehensive unit tests covering all component behaviors and edge cases.

This component provides a foundation for consistent split button patterns across Kibana, ensuring uniform user experience and reducing development overhead for teams implementing similar UI patterns.
