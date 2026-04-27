# Field Formats Plugin

The Field Formats plugin provides a service for formatting field values in Kibana. It's used by data views (index patterns) and throughout the application to consistently format data for display.

## Architecture Overview

### React-First Approach (Current)

Field formatters now use a **React-first architecture** that eliminates vulnerabilities while maintaining backward compatibility:

```
User Data → Field Formatter → {text|html|react} → Consumer Component
                                   ↓
                            React Elements (Safe)
                                   ↓
                          Direct React Rendering ✅ SAFE
                                   
                            HTML Bridge (Legacy)
                                   ↓
                    ReactDOM.renderToStaticMarkup + Auto-escape
                                   ↓
                          Safe HTML String (Backward Compatible)
```

### Key Components

- **`reactConvert`**: Primary conversion method that returns safe React elements
- **`textConvert`**: Plain text conversion (unchanged)
- **HTML Bridge**: Automatically converts React output to HTML for legacy consumers
- **`formatFieldValueReact()`**: Safe utility function for React rendering

## Usage

### Recommended (Safe React Rendering)

```typescript
import { formatFieldValueReact } from '@kbn/discover-utils';

// Using the utility function
const reactNode = formatFieldValueReact({ value, hit, fieldFormats, dataView, field });

// Render directly in your component
return <div className="my-cell">{reactNode}</div>;

const text = formatter.convert(value, 'text');
```

### Legacy (Still Supported)

```typescript
// Still works, now backed by safe React conversion
const html = formatter.convert(value, 'html');
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

  // React conversion (recommended) - use ReactContextTypeSingleConvert for single-value converters
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
- **Avoid `htmlConvert`** - it's deprecated and poses XSS risks
- **Use `checkForMissingValueReact()`** to handle null/empty values
- **Test both single values and arrays** - the base class handles array wrapping

## Migration Guide

### Deprecated APIs

#### ❌ **Deprecated: `htmlConvert`**
```typescript
// DON'T USE
htmlConvert = (value) => `<span style="color: red">${value}</span>`;
```

#### ✅ **Use Instead: `reactConvertSingle`**
```typescript
// SAFE
reactConvertSingle = (value) => <span style={{ color: 'red' }}>{value}</span>;
```

#### ❌ **Deprecated: `dangerouslySetInnerHTML`**
```typescript
// DON'T USE
<div dangerouslySetInnerHTML={{ __html: formatter.convert(value, 'html') }} />
```

#### ✅ **Use Instead: Direct React Rendering**
```typescript
// SAFE - No XSS risk
<div>{formatFieldValueReact({ value, hit, fieldFormats, dataView, field })}</div>
```

### Migration Steps

1. **Replace `htmlConvert` with `reactConvertSingle`**
2. **Replace `dangerouslySetInnerHTML` with `formatFieldValueReact()`**
3. **Update tests to check React output instead of HTML strings**
4. **Remove HTML escaping logic** (handled automatically by the bridge)

## Security

### Prevention

The React-first architecture eliminates vulnerabilities by:

- **No raw HTML generation** in React formatters
- **Automatic HTML escaping** in the backward compatibility bridge
- **Safe highlighting** using `<mark>` elements instead of raw HTML injection
- **Type-safe React elements** that cannot contain malicious scripts

### Backward Compatibility

Legacy consumers using `formatter.convert(value, 'html')` continue to work safely through the HTML bridge, which:

- Converts React elements to safe HTML via `ReactDOM.renderToStaticMarkup`
- Automatically escapes plain text values
- Preserves all existing functionality while eliminating XSS risks
