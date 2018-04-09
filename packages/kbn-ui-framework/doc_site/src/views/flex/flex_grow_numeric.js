import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup>
      <KuiFlexItem grow={1}>1</KuiFlexItem>
      <KuiFlexItem grow={2}>2<br />wraps content if necessary</KuiFlexItem>
      <KuiFlexItem grow={3}>3<br />expands_to_fit_if_content_cannot_wrap</KuiFlexItem>
      <KuiFlexItem grow={4}>4</KuiFlexItem>
    </KuiFlexGroup>

    <br /><br />

    <KuiFlexGroup>
      <KuiFlexItem grow={6}>6</KuiFlexItem>
      <KuiFlexItem grow={3}>3</KuiFlexItem>
      <KuiFlexItem grow={1}>1</KuiFlexItem>
      <KuiFlexItem grow={3}>3</KuiFlexItem>
      <KuiFlexItem grow={6}>6</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
