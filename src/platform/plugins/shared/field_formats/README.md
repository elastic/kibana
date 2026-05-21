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

### Key Components

- **`reactConvert`**: Primary conversion method that returns safe React elements
- **`textConvert`**: Plain text conversion
- **`formatFieldValueReact()`**: Safe utility function for React rendering

## Usage

### React Rendering (Recommended)

```typescript
import { formatFieldValueReact } from '@kbn/discover-utils';

// Using the utility function
const reactNode = formatFieldValueReact({ value, hit, fieldFormats, dataView, field });

// Render directly in your component
return <div className="my-cell">{reactNode}</div>;
```

### Plain Text

```typescript
const text = formatter.convert(value, 'text');
```

## Built-in Formatters

The following formatters are defined within this plugin:

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

## External/Custom Formatters

### Examples of External Formatters

- **Lens Plugin**: `SuffixFormatter` (`x-pack/platform/plugins/shared/lens/common/suffix_formatter/`)
- **Custom Example**: `ExampleCurrencyFormat` (`examples/field_formats_example/common/`)

### Creating Custom Formatters

#### 1. Define Your Formatter

```typescript
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { ReactContextTypeSingleConvert, TextContextTypeConvert } from '@kbn/field-formats-plugin/common';

export class MyCustomFormat extends FieldFormat {
  static id = 'my_custom';
  static title = 'My Custom Format';
  static fieldType = ['string', 'number'];

  // Text conversion (required)
  textConvert: TextContextTypeConvert = (value) => {
    return `Custom: ${value}`;
  };

  // React conversion (recommended)
  reactConvertSingle: ReactContextTypeSingleConvert = (value) => {
    return <span style={{ fontWeight: 'bold' }}>Custom: {value}</span>;
  };
}
```

#### 2. Register Your Formatter

```typescript
// Public plugin
export class MyPlugin implements Plugin {
  setup(core, { fieldFormats }) {
    fieldFormats.register([MyCustomFormat]);
  }
}

// Server plugin  
export class MyServerPlugin implements Plugin {
  setup(core, { fieldFormats }) {
    fieldFormats.register(MyCustomFormat);
  }
}
```

### Custom Formatter Guidelines

- **Always implement `textConvert`** for plain text output
- **Implement `reactConvertSingle`** for safe React rendering (recommended)
- **Use `checkForMissingValueReact()`** to handle null/empty values
- **Test both single values and arrays** - the base class handles array wrapping

## Security

The React-first architecture eliminates XSS vulnerabilities by:

- **No raw HTML generation** in formatters
- **Safe highlighting** using `<mark>` elements instead of raw HTML injection
- **Type-safe React elements** that cannot contain malicious scripts
