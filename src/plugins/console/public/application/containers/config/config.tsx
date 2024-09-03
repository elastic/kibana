/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { Settings } from './settings';
import { Variables } from './variables';
import type { SenseEditor } from '../../models';
import { MIN_HORIZONTAL_CONTAINER_WIDTH } from '../../../../common/constants';

export interface Props {
  editorInstance: SenseEditor | null;
  containerWidth: number;
}

export function Config({ editorInstance, containerWidth }: Props) {
  return (
    <EuiPanel
      color="subdued"
      paddingSize="l"
      hasShadow={false}
      borderRadius="none"
      css={{ height: '100%' }}
    >
      <EuiFlexGroup
        gutterSize="xl"
        direction={containerWidth < MIN_HORIZONTAL_CONTAINER_WIDTH ? 'column' : 'row'}
        // Turn off default responsiveness
        responsive={false}
      >
        <EuiFlexItem>
          <Settings editorInstance={editorInstance} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Variables />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
