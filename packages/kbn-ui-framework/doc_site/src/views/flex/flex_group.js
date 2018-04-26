import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <KuiFlexGroup>
    <KuiFlexItem>Content grid item</KuiFlexItem>
    <KuiFlexItem>
      <p>Another content grid item</p>
      <br/>
      <br/>
      <p>Note how both of these are the same width and height despite having different content?</p>
    </KuiFlexItem>
  </KuiFlexGroup>
);
