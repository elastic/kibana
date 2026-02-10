# @kbn/alerting-v2-external-alerts-schema

Schema definitions and types for external alerts in Alerting V2.

## Overview

This package provides TypeScript types and Zod schemas for defining and validating external alert configurations from 3rd party alert connectors.

## Usage

```typescript
import { datadogAlertEventSchema } from '@kbn/alerting-v2-external-alerts-schema';

// Use schemas for validation
const validated = datadogAlertEventSchema.parse(alertData);
```
