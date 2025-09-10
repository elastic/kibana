# @kbn/core-chrome-layout-constants

Constants and helpers for Kibana's layout system, including CSS variables, DOM selectors, and layout configuration.

## Overview

This package provides essential constants and type-safe helpers for working with Kibana's layout system:

- **Type-safe CSS variables helpers** for accessing layout dimensions and positions
- **Standard DOM element IDs** for key layout containers
- **Content selectors** for finding main application areas
- **Focus trap configuration** for accessibility integration

## Layout CSS Variables

## API

### `layoutVar(name, fallback?)`

Returns a CSS `var()` expression for consuming layout variables.

**Parameters:**

- `name`: The variable name (without prefix)
- `fallback?`: Optional fallback value

**Returns:** Complete CSS `var()` expression

```typescript
import { layoutVar } from '@kbn/core-chrome-layout-constants';

// Basic usage
const height = layoutVar('header-height');
// Returns: "var(--kbn-layout--header-height)"

// With fallback
const width = layoutVar('banner-width', '100%');
// Returns: "var(--kbn-layout--banner-width, 100%)"

// In emotion/CSS-in-JS
const styles = css`
  height: ${layoutVar('header-height')};
  width: ${layoutVar('sidebar-width', '200px')};
  z-index: ${layoutVar('aboveFlyoutLevel')};
`;
```

### `layoutVarName(name)`

Returns the CSS variable name (without `var()` wrapper) for defining variables.

**Parameters:**

- `name`: The variable name (without prefix)

**Returns:** Complete CSS variable name with appropriate prefix

```typescript
import { layoutVarName } from '@kbn/core-chrome-layout-constants';

// Basic usage
const varName = layoutVarName('header-height');
// Returns: "--kbn-layout--header-height"

// For defining variables
const styles = css`
  ${layoutVarName('header-height')}: 48px;
  ${layoutVarName('application-top-bar-height')}: 40px;
`;

// With DOM API
element.style.setProperty(layoutVarName('banner-height'), '50px');
```

## Available Variables

The helpers support all layout system variables with full type checking:

### Layout Variables (`--kbn-layout--` prefix)

- **Banner**: `banner-top`, `banner-left`, `banner-right`, `banner-bottom`, `banner-height`, `banner-width`
- **Header**: `header-top`, `header-bottom`, `header-left`, `header-right`, `header-height`, `header-width`
- **Footer**: `footer-top`, `footer-bottom`, `footer-left`, `footer-right`, `footer-height`, `footer-width`
- **Navigation**: `navigation-top`, `navigation-bottom`, `navigation-left`, `navigation-right`, `navigation-height`, `navigation-width`
- **Sidebar**: `sidebar-top`, `sidebar-bottom`, `sidebar-left`, `sidebar-right`, `sidebar-height`, `sidebar-width`
- **Application**: `application-top`, `application-bottom`, `application-left`, `application-right`, `application-height`, `application-width`
- **Special**: `aboveFlyoutLevel`

### Application Variables (`--kbn-application--` prefix)

- **Top Bar**: `application-top-bar-top`, `application-top-bar-bottom`, `application-top-bar-left`, `application-top-bar-right`, `application-top-bar-height`, `application-top-bar-width`
- **Bottom Bar**: `application-bottom-bar-top`, `application-bottom-bar-bottom`, `application-bottom-bar-left`, `application-bottom-bar-right`, `application-bottom-bar-height`, `application-bottom-bar-width`
- **Content**: `application-content-top`, `application-content-bottom`, `application-content-left`, `application-content-right`, `application-content-height`, `application-content-width`

## Usage Examples

### With Emotion CSS-in-JS

```typescript
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const headerStyles = css`
  position: sticky;
  height: ${layoutVar('header-height')};
  width: ${layoutVar('header-width')};
  z-index: ${layoutVar('aboveFlyoutLevel')};
`;
```

### With React Inline Styles

```tsx
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const MyComponent = () => (
  <div
    style={{
      height: layoutVar('application-content-height'),
      width: layoutVar('application-content-width'),
    }}
  >
    Content
  </div>
);
```

## Migration from Manual Strings

### Before (Manual)

```typescript
// ❌ No type safety, easy to make typos
const styles = css`
  height: var(--kbn-layout--header-height);
  width: var(--kbn-layout--header-width);
  z-index: var(--kbn-layout--aboveFlyoutLevel);
`;
```

### After (Type-Safe)

```typescript
// ✅ Type-safe with autocomplete
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const styles = css`
  height: ${layoutVar('header-height')};
  width: ${layoutVar('header-width')};
  z-index: ${layoutVar('aboveFlyoutLevel')};
`;
```

## TypeScript Support

All variable names are fully typed using TypeScript template literal types. This provides:

- **Compile-time validation**: Invalid variable names cause TypeScript errors
- **IDE autocomplete**: Full IntelliSense support for all available variables
- **Refactoring safety**: Renaming variables updates all usages consistently

```typescript
// ✅ Valid - TypeScript allows this
layoutVar('header-height');

// ❌ Invalid - TypeScript error
layoutVar('header-invalid'); // Error: Argument of type '"header-invalid"' is not assignable
```

## Related Packages

- [`@kbn/core-chrome-layout-components`](../core-chrome-layout-components) - React components that define and use these variables
- [`@kbn/core-chrome-layout`](../core-chrome-layout) - Layout implementations that consume these variables
