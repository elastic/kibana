/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';

export const IconWithCount = React.memo<{
  count: number;
  icon: string;
}>(({ count, icon }) => (
  <EuiFlexGroup alignItems="center" gutterSize="none" css={{ marginLeft: 'auto', flexGrow: 0 }}>
    <EuiFlexItem grow={false}>
      <EuiIcon
        css={{ marginRight: '4px' }}
        size="s"
        type={icon}
        data-test-subj="comment-count-icon"
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">{count}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
));

IconWithCount.displayName = 'IconWithCount';
