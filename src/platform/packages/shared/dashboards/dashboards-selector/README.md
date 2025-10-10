# `@kbn/dashboards-selector`

A reusable Elastic UI component for selecting Kibana dashboards.

---

## Quick-start

```tsx
import React, { useState } from 'react';
import { DashboardsSelector } from '@kbn/dashboards-selector';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

interface Props {
  contentManagement: ContentManagementPublicStart;
}

export const MyComponent = ({ contentManagement }: Props) => {
  // Persist only the dashboard ids in your form state
  const [dashboardsFormData, setDashboardsFormData] = useState<Array<{ id: string }>>([]);

  return (
    <DashboardsSelector
      contentManagement={contentManagement}
      dashboardsFormData={dashboardsFormData}
      onChange={(opts) => {
        // opts => Array<EuiComboBoxOptionOption<string>>
        setDashboardsFormData(opts.map(({ value }) => ({ id: value })));
      }}
      placeholder="Select one or more dashboards"
    />
  );
};
```

---

## `DashboardsSelector` API reference

| Prop                 | Type                                                         | Required | Description                                                                                                             |
| -------------------- | ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `contentManagement`  | `ContentManagementPublicStart`                               | ✔︎       | Instance of the Content Management service obtained from Kibana core start services.                                    |
| `dashboardsFormData` | `Array<{ id: string }>`                                      | ✔︎       | The **current** form value. Only the dashboard id is required. Used to pre-select dashboards when the component mounts. |
| `onChange`           | `(selected: Array<EuiComboBoxOptionOption<string>>) => void` | ✔︎       | Callback fired every time the user selection changes.                                                                   |
| `placeholder`        | `string`                                                     | ✖︎       | Placeholder text shown when nothing is selected. Default: `"Select dashboards"`.                                        |
