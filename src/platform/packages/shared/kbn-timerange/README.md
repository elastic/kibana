# @kbn/timerange

This package shares a set of utilities for working with timeranges.

## Utils

### getDateRange

This function return a timestamp for `startDate` and `endDate` of a given date range.

```tsx
import { getDateRange } from '@kbn/timerange';

const { startDate, endDate } = getDateRange({ from: 'now-24h', to: 'now' });
```

### getDateISORange

This function return an ISO string for `startDate` and `endDate` of a given date range.

```tsx
import { getDateISORange } from '@kbn/timerange';

const { startDate, endDate } = getDateISORange({ from: 'now-24h', to: 'now' });
```
