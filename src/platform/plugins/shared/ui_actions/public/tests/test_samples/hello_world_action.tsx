/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiFlyoutBody } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ActionDefinition } from '../../actions';

type StartServices = Pick<CoreStart, 'overlays' | 'rendering'>;

const getMenuItem = (core: StartServices) => {
  return () => {
    return core.rendering.addContext(
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>Hello world!</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={'danger'}>{'secret'}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
};

export const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

export function createHelloWorldAction(
  coreStart: StartServices & Pick<CoreStart, 'overlays'>
): ActionDefinition {
  const { overlays, rendering } = coreStart;
  return {
    id: ACTION_HELLO_WORLD,
    type: ACTION_HELLO_WORLD,
    getIconType: () => 'lock',
    MenuItem: getMenuItem(coreStart),
    execute: async () => {
      overlays.openFlyout(
        toMountPoint(
          <EuiFlyoutBody>Hello World, I am a hello world action!</EuiFlyoutBody>,
          rendering
        ),
        {
          'data-test-subj': 'helloWorldAction',
          ownFocus: true,
        }
      );
    },
  };
}
