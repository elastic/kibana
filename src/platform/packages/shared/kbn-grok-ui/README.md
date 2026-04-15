# @kbn/grok-ui

Tools for parsing/converting Grok expressions (into Oniguruma/JS Regex) and UI components for working with Grok patterns.

## Overview

This package provides two ways to work with Grok patterns:

1. **Simplified Context-Based API** (Recommended) - Use React contexts and hooks to work with plain string patterns
2. **Advanced Direct API** - Work directly with `GrokCollection` and `DraftGrokExpression` instances for lower-level control

## Simplified Usage (Recommended)

The context-based API abstracts away the complexity of managing `DraftGrokExpression` instances. You work with plain `string[]` arrays, and the package handles the lifecycle management internally.

### 1. Setup the Provider

Wrap your application with the `GrokCollectionProvider`:

```tsx
import { GrokCollection, GrokCollectionProvider } from '@kbn/grok-ui';

const grokCollection = new GrokCollection();
// Collection setup will happen automatically

function App() {
  return (
    <GrokCollectionProvider grokCollection={grokCollection}>
      <YourComponents />
    </GrokCollectionProvider>
  );
}
```

### 2. Working with Patterns

Use the `useGrokExpressions` hook to convert plain strings to managed expression instances:

```tsx
import { useGrokExpressions } from '@kbn/grok-ui';

function GrokEditor() {
  const [patterns, setPatterns] = useState(['%{TIMESTAMP} %{LOGLEVEL}']);
  
  // Automatically converts strings to DraftGrokExpression instances
  const expressions = useGrokExpressions(patterns);
  
  // expressions lifecycle is managed automatically - no cleanup needed!
}
```

### 3. Rendering Sample Highlights with Context

For rendering Grok pattern highlights in your UI, use the provider + context pattern:

```tsx
import { 
  GrokCollectionProvider, 
  GrokExpressionsProvider, 
  GrokSampleWithContext 
} from '@kbn/grok-ui';

function SampleHighlighter() {
  const patterns = ['%{TIMESTAMP:timestamp} %{LOGLEVEL:level}'];
  const sampleLog = '2024-01-27 10:30:00 INFO Application started';

  return (
    <GrokCollectionProvider grokCollection={collection}>
      <GrokExpressionsProvider patterns={patterns}>
        <GrokSampleWithContext sample={sampleLog} />
      </GrokExpressionsProvider>
    </GrokCollectionProvider>
  );
}
```

### 4. Available Context Components

#### `GrokSampleWithContext`
Read-only sample highlighting (optimized for data grids):

```tsx
<GrokExpressionsProvider patterns={patterns}>
  <GrokSampleWithContext sample="2024-01-27 192.168.1.1 GET /api" />
</GrokExpressionsProvider>
```

#### `GrokSampleInputWithContext`
Editable sample input with Monaco editor:

```tsx
<GrokExpressionsProvider patterns={patterns}>
  <GrokSampleInputWithContext sample={editableSample} />
</GrokExpressionsProvider>
```

### 5. Form Integration

Forms can work directly with `string[]` arrays:

```tsx
interface GrokFormData {
  patterns: string[];  // ← Plain strings!
  from: string;
}

function GrokProcessorForm() {
  const { control, watch } = useForm<GrokFormData>({
    defaultValues: {
      patterns: [''],
      from: 'message',
    },
  });

  const patternStrings = watch('patterns');
  
  // Convert to expressions for validation/preview
  const expressions = useGrokExpressions(patternStrings);
  
  // Form submits plain strings, no conversion needed!
}
```

### Available Hooks

#### `useGrokCollection()`
Access the GrokCollection instance from context:

```tsx
const { grokCollection, isLoading, error } = useGrokCollection();
```

#### `useGrokExpressions(patterns: string[])`
Convert pattern strings to managed `DraftGrokExpression` instances:

```tsx
const patterns = ['%{IP}', '%{TIMESTAMP}'];
const expressions = useGrokExpressions(patterns);
// Auto-managed lifecycle - created, updated, and destroyed automatically
```

#### `useGrokExpressionsFromContext()`
Access expressions from the `GrokExpressionsProvider`:

```tsx
const expressions = useGrokExpressionsFromContext();
```

## Advanced Usage

For lower-level control, you can work directly with the models.

### Creating a GrokCollection

```ts
import { GrokCollection } from '@kbn/grok-ui';

const collection = new GrokCollection();

// Add pattern definitions
Object.entries(PATTERN_MAP).forEach(([key, value]) => {
  collection.addPattern(key, String.raw`${value}`);
});

// Setup (resolves patterns)
await collection.setup();
```

### Working with DraftGrokExpression

```ts
import { DraftGrokExpression } from '@kbn/grok-ui';

const draftGrokExpression = new DraftGrokExpression(collection, initialPattern);

// Update the expression
draftGrokExpression.updateExpression(
  String.raw`^\"(?<rid>[^\"]+)\" \| %{IPORHOST:clientip} \[%{HTTPDATE:timestamp}\]`
);

// Get the compiled regex
const regexp = draftGrokExpression.getRegex();

// Or parse samples directly
const parsed = draftGrokExpression.parse([
  '"uRzbUwp5eZgAAAAaqIAAAAAa" | 5.3.2.1 [24/Feb/2013:13:40:51 +0100]',
  '"URzbTwp5eZgAAAAWlbUAAAAV" | 4.3.2.7 [14/Feb/2013:13:40:47 +0100]',
]);

// Don't forget to clean up!
draftGrokExpression.destroy();
```

### Direct Component Usage

If you're not using contexts, components require props:

#### Expression Editor

The Expression component accepts a simple string pattern and internally manages a `DraftGrokExpression` instance:

```tsx
import { Expression } from '@kbn/grok-ui';

<Expression
  pattern="%{IP:client} %{WORD:method}"
  grokCollection={grokCollection}
  onChange={(newPattern) => console.log(newPattern)}
/>
```

#### Read-Only Sample

```tsx
import { Sample } from '@kbn/grok-ui';

<Sample
  grokCollection={grokCollection}
  draftGrokExpressions={[expression1, expression2]}
  sample="log line to highlight"
/>
```

#### Sample Input (Editable)

```tsx
import { SampleInput } from '@kbn/grok-ui';

<SampleInput
  grokCollection={grokCollection}
  draftGrokExpressions={expressions}
  sample={sample}
  onChangeSample={setSample}
/>
```

## Custom Pattern Definitions

You can update custom patterns dynamically:

```ts
// With context
const { grokCollection } = useGrokCollection();
grokCollection.setCustomPatterns({
  MY_CUSTOM_PATTERN: '\\d{3}-\\d{4}',
  ANOTHER_PATTERN: '[A-Z]+\\d+',
});

// Direct
collection.setCustomPatterns({ /* ... */ });
```

## Architecture

```
GrokCollectionProvider
  └─> Provides GrokCollection instance
      └─> Handles setup and lifecycle
  
GrokExpressionsProvider
  └─> Converts string[] → DraftGrokExpression[]
      └─> Manages expression lifecycle automatically
  
Components
  └─> Read from contexts or accept props directly
```

## Benefits of Context-Based API

✅ **Simpler API**: Work with plain `string[]` instead of `DraftGrokExpression[]`  
✅ **Automatic Lifecycle**: No manual `.destroy()` calls needed  
✅ **Better Performance**: Single management point for all expressions  
✅ **Less Boilerplate**: No need to create/manage instances manually  
✅ **Type Safety**: TypeScript ensures correct usage  


## Examples

See the Streams processing UI for a complete implementation example at:
`x-pack/platform/plugins/shared/streams_app/public/components/data_management/stream_detail_enrichment/`
