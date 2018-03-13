import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
} from '../../../../components';

const ITEM_STYLE = { width: '300px' };

export default () => (
  <div>
    <KuiFlexGrid>
      <KuiFlexItem style={ITEM_STYLE}><div>One</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Two</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Three</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Four</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Five</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Six</div></KuiFlexItem>
      <KuiFlexItem style={ITEM_STYLE}><div>Seven</div></KuiFlexItem>
    </KuiFlexGrid>
  </div>
);
