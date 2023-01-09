# @kbn/cases-components

The package exports a collection of pure Cases components.

## Components

### Status

The component renders the status of a case. Usage:

```
import { Status, CaseStatuses } from '@kbn/cases-components';

<Status status={CaseStatuses.open} />
```

### Tooltip

The component renders the tooltip with case details on hover of an Element. Usage:

```
import { Tooltip } from '@kbn/cases-components';
import type { CaseTooltipProps } from '@kbn/cases-components';

const tooltipProps = {
  title: 'Case title',
  description: 'Case description',
  createdAt: '2020-02-19T23:06:33.798Z',
  createdBy: {
    fullName: 'Elastic User',
    username: 'elastic',
  },
  totalComments: 1,
  status: 'open',
}

<Tooltip {...tooltipProps}>
  <span>This is a demo span</span>
</Tooltip>
```
