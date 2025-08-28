# ES|QL Editor

A Monaco-based editor for ES|QL (Elasticsearch Query Language) with syntax highlighting, autocompletion, and validation.

## Features

- **Syntax Highlighting**: Full ES|QL syntax support with Monaco editor
- **Autocompletion**: Field and function suggestions
- **Error Detection**: Real-time syntax and semantic error checking
- **Query History**: Save and restore previous queries
- **Document Count Estimation**: Real-time estimation of documents that will be queried
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Quick access to common actions

## Document Count Feature

The ES|QL editor includes a real-time document count estimator that shows the approximate number of documents that will be queried before executing the full query.

### How it Works

1. **Automatic Triggering**: The count is calculated automatically 500ms after the user stops typing
2. **Query Transformation**: The original ES|QL query is transformed by:
   - Removing any `LIMIT` clauses
   - Appending `STATS count = COUNT(*)` to get the total count
3. **Display**: Shows the count next to the line count in the editor footer

### Example

**Original Query:**
```esql
FROM kibana_sample_data_logs | LIMIT 10 | WHERE 'geo.src'=="US"
```

**Count Query (executed automatically):**
```esql
FROM kibana_sample_data_logs | WHERE 'geo.src'=="US" | STATS count = COUNT(*)
```

**Display:** `~14,074 docs`

### States

- **Loading**: Shows "Calculating..." with a loading spinner
- **Success**: Shows "~X docs" with a document icon and traffic light indicator
- **Error**: Shows greyed-out "~? docs" with a documents icon
- **Empty**: No indicator shown when query is empty

### Traffic Light System

The feature includes a traffic light indicator based on estimated execution time:
- 🟢 **Green** (≤3s): Fast queries
- 🟡 **Yellow** (3-10s): Medium queries  
- 🔴 **Red** (>10s): Slow queries

Hover over the indicator to see the exact estimated execution time.

### Implementation

- **Hook**: `useEsqlDocumentCount` - Manages the count calculation logic
- **Component**: `DocumentCountIndicator` - Renders the count in the footer
- **Integration**: Added to the editor footer next to the line count

## Usage

```tsx
import { ESQLEditor } from '@kbn/esql-editor';

<ESQLEditor
  query={esqlQuery}
  onQueryChange={setEsqlQuery}
  // ... other props
/>
```

The document count feature is automatically enabled and requires no additional configuration.