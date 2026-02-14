# Field formats

Index pattern field formatters for converting raw field values to display-ready strings or React elements.

## Overview

Field formatters convert raw Elasticsearch field values into human-readable representations. They support multiple output modes:

- **`text`**: Plain text output for sorting, filtering, CSV export, and non-visual operations
- **`html`**: HTML string output (legacy, for backward compatibility)
- **`react`**: React element output (preferred for UI rendering)

## Usage

### Rendering Formatted Values (Recommended)

Use the `FormattedValue` component for rendering formatted field values in React UIs:

```tsx
import { FormattedValue } from '@kbn/field-formats-plugin/public';

<FormattedValue
  fieldFormat={dataView.getFormatterForField(field)}
  value={row.flattened[field.name]}
  options={{ field, hit: row.raw }}
  className="myCustomClass"
/>
```

This component automatically:
1. Uses React rendering when available (preferred)
2. Falls back to HTML rendering for legacy formatters
3. Logs deprecation warnings in development mode for legacy usage

### Text Output

For non-visual operations (sorting, filtering, export):

```ts
const textValue = fieldFormat.convert(value, 'text');
```

## Creating Custom Field Formatters

### Implementing React Rendering (Recommended)

New formatters should implement `reactConvert` for optimal UI rendering:

```tsx
import React from 'react';
import { FieldFormat, ReactContextTypeConvert, checkForMissingValueReact } from '@kbn/field-formats-plugin/common';

export class MyCustomFormat extends FieldFormat {
  static id = 'my-custom';
  static title = 'My Custom Format';
  static fieldType = ['string', 'number'];

  // Text conversion (required) - used for sorting, filtering, export
  textConvert = (val: unknown) => {
    return String(val);
  };

  // React conversion (recommended) - used for UI rendering
  reactConvert: ReactContextTypeConvert = (val, options) => {
    const missingValue = checkForMissingValueReact(val);
    if (missingValue !== undefined) {
      return missingValue;
    }
    return <span className={options?.className}>{this.formatValue(val)}</span>;
  };

  private formatValue(val: unknown): string {
    // Your formatting logic here
    return String(val);
  }
}
```

### Legacy HTML Conversion (Deprecated)

> **⚠️ Deprecated**: `htmlConvert` is deprecated for new formatters. Use `reactConvert` instead.
>
> The HTML conversion path uses `dangerouslySetInnerHTML` which poses security risks and
> prevents React's reconciliation optimizations. New formatters should implement `reactConvert`.

If you must support legacy consumers that directly call `convert(value, 'html')`:

```ts
// DEPRECATED - Prefer reactConvert instead
htmlConvert = (val: unknown) => {
  const missing = this.checkForMissingValueHtml(val);
  if (missing !== undefined) return missing;
  return escape(this.formatValue(val));
};
```

## Migration Guide for Third-Party Plugins

### Migrating Formatters from HTML to React

If your plugin defines custom field formatters using `htmlConvert`, you should migrate to `reactConvert`:

**Before (HTML - deprecated):**
```ts
class MyFormat extends FieldFormat {
  htmlConvert = (val: unknown) => {
    return `<span class="my-class">${escape(String(val))}</span>`;
  };
}
```

**After (React - recommended):**
```tsx
import React from 'react';
import { checkForMissingValueReact } from '@kbn/field-formats-plugin/common';

class MyFormat extends FieldFormat {
  reactConvert: ReactContextTypeConvert = (val, options) => {
    const missingValue = checkForMissingValueReact(val);
    if (missingValue !== undefined) return missingValue;
    return <span className="my-class">{String(val)}</span>;
  };
}
```

### Migrating Consumers from HTML to FormattedValue

If your code uses formatter HTML output with `dangerouslySetInnerHTML`:

**Before (HTML - deprecated):**
```tsx
const html = fieldFormat.convert(value, 'html', options);
return <span dangerouslySetInnerHTML={{ __html: html }} />;
```

**After (FormattedValue - recommended):**
```tsx
import { FormattedValue } from '@kbn/field-formats-plugin/public';

return (
  <FormattedValue
    fieldFormat={fieldFormat}
    value={value}
    options={options}
  />
);
```

### Checking for React Support

To conditionally handle formatters with or without React support:

```ts
if (fieldFormat.hasReactSupport()) {
  // Formatter supports React rendering
  const reactNode = fieldFormat.convertToReact(value, options);
} else {
  // Fall back to HTML (or use FormattedValue which handles this automatically)
  const html = fieldFormat.convert(value, 'html', options);
}
```

## Utilities

### Empty Value Handling

Use the provided utilities for consistent empty/missing value display:

```tsx
import { checkForMissingValueReact, EmptyValue } from '@kbn/field-formats-plugin/common';

// In your reactConvert:
const missingValue = checkForMissingValueReact(val);
if (missingValue !== undefined) {
  return missingValue; // Renders styled "(empty)" or "-"
}
```

### Search Highlighting

For formatters that need to highlight search terms:

```tsx
import { getHighlightReact } from '@kbn/field-formats-plugin/common';

reactConvert: ReactContextTypeConvert = (val, options) => {
  const text = String(val);
  const highlights = options?.hit?.highlight?.[options?.field?.name ?? ''];
  
  if (highlights) {
    return getHighlightReact(text, highlights);
  }
  return text;
};
```

## Strict Mode (Optional)

In development, you can enable strict mode to throw errors when legacy HTML formatters are used:

```ts
// In your plugin setup
if (process.env.NODE_ENV === 'development') {
  process.env.FIELD_FORMAT_STRICT_REACT_MODE = 'true';
}
```

When strict mode is enabled, `FormattedValue` will throw an error if a formatter doesn't support React rendering, helping catch migration gaps during development.

## Deprecation Timeline

| Version | Change |
|---------|--------|
| 8.x | `htmlConvert` deprecated; `reactConvert` introduced |
| 9.0 | Warning logs for legacy HTML usage in development |
| 10.0 | (Planned) `htmlConvert` may be removed; strict mode may become default |

## API Reference

### FieldFormat Base Class

| Property/Method | Description |
|-----------------|-------------|
| `textConvert` | Text conversion function (required for custom text formatting) |
| `htmlConvert` | HTML conversion function (deprecated) |
| `reactConvert` | React conversion function (recommended) |
| `convert(value, 'text')` | Get text representation |
| `convert(value, 'html')` | Get HTML representation (legacy) |
| `convertToReact(value, options)` | Get React element (returns `undefined` if not supported) |
| `hasReactSupport()` | Check if formatter supports React rendering |

### FormattedValue Component

| Prop | Type | Description |
|------|------|-------------|
| `fieldFormat` | `IFieldFormat` | The formatter instance |
| `value` | `unknown` | The raw value to format |
| `options` | `HtmlContextTypeOptions & ReactContextTypeOptions` | Context options (field, hit, etc.) |
| `className` | `string?` | CSS class for the wrapper element |
| `data-test-subj` | `string?` | Test subject for E2E testing |
