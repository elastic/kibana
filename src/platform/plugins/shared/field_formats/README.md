# Field Formats Plugin

The Field Formats plugin provides a service for formatting field values in Kibana. It's used by data views (index patterns) and throughout the application to consistently format data for display.

## Architecture Overview

Field formatters use a **React-first architecture**:

```
User Data → Field Formatter → {text|react} → Consumer Component
                                   ↓
                            React Elements (Safe)
                                   ↓
                          Direct React Rendering
```

### Public API vs Protected Hooks

The `FieldFormat` base class exposes two **public** methods that consumers call:

- **`convertToText(value, options)`** — returns a plain `string`. Handles arrays automatically (JSON-encodes them), then delegates to the protected `textConvert` hook for scalar values.
- **`convertToReact(value, options)`** — returns a `ReactNode`. Handles arrays, missing values, and search-term highlighting automatically, then delegates to the protected `reactConvert` hook for scalar values.

Subclasses customize behaviour by overriding two **protected** hooks:

- **`textConvert`** — scalar-value text conversion.
- **`reactConvert`** — scalar-value React conversion. When omitted, `convertToReact` falls back to `textConvert` output with automatic highlight wrapping.

```
                        ┌──────────────────────────┐
  Consumer calls:       │   convertToText(value)   │  public
                        │   convertToReact(value)  │  public
                        └────────────┬─────────────┘
                                     │ delegates (after array/missing/highlight handling)
                        ┌────────────▼─────────────┐
  Subclass overrides:   │   textConvert(value)     │  protected
                        │   reactConvert(value)    │  protected
                        └──────────────────────────┘
```

> **Do not call `textConvert` or `reactConvert` from outside a `FieldFormat` subclass.** They are `protected` and not part of the public API.

## Usage

### React Rendering (Recommended)

```tsx
import { formatFieldValueReact } from '@kbn/discover-utils';

// Using the utility function
const reactNode = formatFieldValueReact({ value, hit, fieldFormats, dataView, field });

// Render directly in your component
return <div className="my-cell">{reactNode}</div>;
```

### Direct Formatter Access

```typescript
// Get a formatter instance from the registry
const formatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.NUMBER);

// Plain text
const text: string = formatter.convertToText(42);

// React node (handles highlighting, missing values, arrays)
const node: ReactNode = formatter.convertToReact(42, { field: { name: 'price' }, hit });
```

## Creating Custom Formatters

### 1. Define Your Formatter

At minimum, override `textConvert`. Add `reactConvert` when you need custom React rendering (colors, links, styled elements, etc.).

#### Text-Only Formatter

```typescript
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { TextContextTypeConvert } from '@kbn/field-formats-plugin/common';

export class MyFormat extends FieldFormat {
  static id = 'my_format';
  static title = 'My Format';
  static fieldType = ['string', 'number'];

  textConvert: TextContextTypeConvert = (value) => {
    return `Formatted: ${value}`;
  };
}
```

The base class will use `textConvert` output for both `convertToText()` and `convertToReact()`, automatically adding highlight `<mark>` wrapping and missing-value labels in React mode.

#### Formatter with Custom React Rendering

```tsx
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { ReactConvertFunction, TextContextTypeConvert } from '@kbn/field-formats-plugin/common';

export class ColoredFormat extends FieldFormat {
  static id = 'colored';
  static title = 'Colored';
  static fieldType = ['string', 'number'];

  textConvert: TextContextTypeConvert = (value) => {
    return String(value);
  };

  reactConvert: ReactConvertFunction = (value) => {
    // Handle missing values
    const missing = this.checkForMissingValueReact(value);
    if (missing) return missing;

    return <span style={{ color: 'blue' }}>{String(value)}</span>;
  };
}
```

> When you override `reactConvert`, you take responsibility for missing-value handling and highlighting. Call `this.checkForMissingValueReact(value)` at the top.

### 2. Register Your Formatter

```typescript
// Public plugin
export class MyPlugin implements Plugin {
  setup(core, { fieldFormats }) {
    fieldFormats.register([MyFormat]);
  }
}

// Server plugin
export class MyServerPlugin implements Plugin {
  setup(core, { fieldFormats }) {
    fieldFormats.register(MyFormat);
  }
}
```

### Guidelines

- **Always implement `textConvert`** for plain text output.
- **Implement `reactConvert`** only when you need custom React elements (styled output, links, etc.). The base class provides sensible React rendering from `textConvert` alone.
- **Handle missing values** — call `checkForMissingValueText()` / `checkForMissingValueReact()` in your overrides.
- **Don't handle arrays** — the base class wraps arrays automatically before calling your hooks.
- **Don't override `convertToText` or `convertToReact`** — override the protected hooks instead so array handling is always applied correctly.
- **Use `this.param('name')`** to access user-configurable parameters, and override `getParamDefaults()` to set defaults.

## Built-in Formatters

### Core Formatters (`/common/converters/`)

- **`BoolFormat`** - Boolean values (`true`/`false`)
- **`BytesFormat`** - File sizes (1KB, 1MB, etc.)
- **`ColorFormat`** - Values with background/text colors based on rules
- **`CurrencyFormat`** - Monetary values with currency symbols
- **`DurationFormat`** - Time durations (ms, seconds, minutes, etc.)
- **`GeoPointFormat`** - Geographic coordinates
- **`HistogramFormat`** - Histogram data structures
- **`IpFormat`** - IP addresses
- **`NumberFormat`** - Numeric values with locale formatting
- **`NumeralFormat`** - Base class for numeric formatters
- **`PercentFormat`** - Percentage values
- **`RelativeDateFormat`** - Relative time ("2 hours ago", "in 3 days")
- **`SourceFormat`** - Raw JSON source documents
- **`StaticLookupFormat`** - Value mapping/lookup tables
- **`StringFormat`** - String values with optional transformations
- **`TruncateFormat`** - String truncation with ellipsis
- **`UrlFormat`** - URLs rendered as links, images, or audio

### Platform-Specific Formatters

#### Public (Browser) Only (`/public/lib/converters/`)
- **`DateFormat`** - Date/time formatting with timezone support
- **`DateNanosFormat`** - High-precision nanosecond dates

#### Server Only (`/server/lib/converters/`)
- **`DateFormat`** (server version) - Server-side date formatting
- **`DateNanosFormat`** (server version) - Server-side nanosecond dates

### External/Custom Formatters (Examples)

- **Lens Plugin**: `SuffixFormatter` (`x-pack/platform/plugins/shared/lens/common/suffix_formatter/`)
- **Custom Example**: `ExampleCurrencyFormat` (`examples/field_formats_example/common/`)

## Security

The React-first architecture eliminates XSS vulnerabilities by:

- **No raw HTML generation** in formatters
- **Safe highlighting** using `<mark>` elements instead of raw HTML injection
- **Type-safe React elements** that cannot contain malicious scripts
