# @kbn/as-code-shared-schemas

Validation schemas and TypeScript types for common **Kibana As Code entities**.

## Overview

This package provides runtime validation schemas and associated TypeScript types for foundational identifiers and objects used in the Kibana As Code API. It is designed for internal use within server-side code to help ensure consistency and reliability across As Code plugins and packages.

The schemas are based on `@kbn/config-schema` and can be used in API route validation, data modeling, or anywhere runtime type checking is required.

## Usage Example

```typescript
import { idSchema } from '@kbn/as-code-shared-schemas';

// Example validation
const result = idSchema.validate('dashboard_abc123'); // throws if invalid
```

## Exported Schemas

- `asCodeIdSchema` — Validates As Code identifiers according to platform requirements.
