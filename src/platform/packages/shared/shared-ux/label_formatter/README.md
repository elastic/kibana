# @kbn/shared-ux-label-formatter

A utility for formatting labels with consistent capitalization rules across Kibana.

## Usage

```typescript
import { formatLabel } from '@kbn/shared-ux-label-formatter';

// Glossary terms get exact formatting
formatLabel('machine learning'); // 'Machine Learning'

// Non-glossary terms get first-letter capitalized
formatLabel('settings'); // 'Settings'
```

## Features

- Maintains a glossary of terms with special formatting requirements
- Applies consistent first-letter capitalization for non-glossary terms
- Handles non-string ReactNode types gracefully
