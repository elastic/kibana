# @kbn/shared-ux-label-formatter

A utility for formatting labels with consistent rules across Kibana.

## Usage

```typescript
import { toSentenceCase } from '@kbn/shared-ux-label-formatter';

// Glossary terms get exact formatting
toSentenceCase('machine learning'); // 'Machine Learning'

// Non-glossary terms get first-letter capitalized
toSentenceCase('settings'); // 'Settings'
```

## Features

- Maintains a glossary of terms with special formatting requirements
- Applies consistent first-letter capitalization for non-glossary terms
