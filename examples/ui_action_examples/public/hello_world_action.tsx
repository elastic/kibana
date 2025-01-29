/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, EuiModalBody, EuiButton } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

export const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

type StartServices = Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile'>;

export const createHelloWorldActionDefinition = (
  getStartServices: () => Promise<StartServices>
) => ({
  id: ACTION_HELLO_WORLD,
  type: ACTION_HELLO_WORLD,
  getDisplayName: () => 'Hello World!',
  execute: async () => {
    const { overlays, ...startServices } = await getStartServices();
    const overlay = overlays.openModal(
      toMountPoint(
        <EuiModalBody>
          <EuiText data-test-subj="helloWorldActionText">Hello world!</EuiText>
          <EuiButton data-test-subj="closeModal" onClick={() => overlay.close()}>
            Close
          </EuiButton>
        </EuiModalBody>,
        startServices
      )
    );
  },
});
