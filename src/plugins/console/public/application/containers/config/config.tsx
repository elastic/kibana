/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { Settings } from './settings';
import { Variables } from './variables';

export interface Props {
  isVerticalLayout: boolean;
}

export function Config({ isVerticalLayout }: Props) {
  return (
    <EuiPanel
      color="subdued"
      paddingSize="l"
      hasShadow={false}
      borderRadius="none"
      css={{ height: '100%' }}
      data-test-subj="consoleConfigPanel"
    >
      <EuiFlexGroup
        gutterSize="xl"
        direction={isVerticalLayout ? 'column' : 'row'}
        // Turn off default responsiveness
        responsive={false}
      >
        <EuiFlexItem>
          <Settings />
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <Variables />
          <EuiSpacer size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
