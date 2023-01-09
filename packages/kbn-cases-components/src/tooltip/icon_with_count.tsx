/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';

export const IconWithCount = React.memo<{
  count: number;
  icon: string;
}>(({ count, icon }) => (
  <span style={{ width: 'fit-content'}}>
      <EuiFlexGroup alignItems="center" gutterSize="none"  style={{ width: 'fit-content'}}>
        <EuiFlexItem grow={false}>
          <EuiIcon style={{marginRight: '4px'}} size="s" type={icon} data-test-subj="comment-count-icon" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {count}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>         
  </span>
));

IconWithCount.displayName = 'IconWithCount';
