import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGrid columns={3}>
      <KuiFlexItem><div>One</div></KuiFlexItem>
      <KuiFlexItem><div>Two</div></KuiFlexItem>
      <KuiFlexItem><div>Three</div></KuiFlexItem>
      <KuiFlexItem><div>Four</div></KuiFlexItem>
      <KuiFlexItem><div>Five</div></KuiFlexItem>
      <KuiFlexItem><div>Six</div></KuiFlexItem>
      <KuiFlexItem><div>Seven</div></KuiFlexItem>
    </KuiFlexGrid>
  </div>
);
