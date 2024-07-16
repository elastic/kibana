/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiFlyoutBody } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ActionDefinition } from '../../actions';

type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

const getMenuItem = (core: StartServices) => {
  return () => {
    return (
      <KibanaRenderContextProvider {...core}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>Hello world!</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={'danger'}>{'secret'}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaRenderContextProvider>
    );
  };
};

export const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

export function createHelloWorldAction(
  coreStart: StartServices & Pick<CoreStart, 'overlays'>
): ActionDefinition {
  const { overlays, ...startServices } = coreStart;
  return {
    id: ACTION_HELLO_WORLD,
    type: ACTION_HELLO_WORLD,
    getIconType: () => 'lock',
    MenuItem: getMenuItem(startServices),
    execute: async () => {
      overlays.openFlyout(
        toMountPoint(
          <EuiFlyoutBody>Hello World, I am a hello world action!</EuiFlyoutBody>,
          startServices
        ),
        {
          'data-test-subj': 'helloWorldAction',
          ownFocus: true,
        }
      );
    },
  };
}
