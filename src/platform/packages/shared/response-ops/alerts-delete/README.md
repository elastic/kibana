# @kbn/response-ops-alerts-delete

This package provides components and utilities for handling the deletion of alerts by response-ops.

## Storybook

```sh
> node scripts/storybook response-ops
```

## Usage

### Modal

The `AlertDeleteModal` component can be used to display a confirmation modal for deleting alerts.

```tsx
import React, { useState } from 'react';
import { AlertsDeleteModal } from '@kbn/response-ops-alerts-delete';

function Example() {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <div>
      <button onClick={() => setModalVisible(true)}>Delete Alerts</button>
      <AlertsDeleteModal isVisible={isModalVisible} onCloseModal={() => setModalVisible(false)} />
    </div>
  );
}

export default Example;
```

### Rule Settings Section

The `AlertDeleteRuleSettingsSection` component can be used to display a section for managing alert deletion rules.

```tsx
import React from 'react';
import { AlertDeleteRuleSettingsSection } from '@kbn/response-ops-alerts-delete';

function RuleSettingsExample() {
  return (
    <div>
      <AlertDeleteRuleSettingsSection />
    </div>
  );
}

export default RuleSettingsExample;
```
