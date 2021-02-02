/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiText, EuiModalBody, EuiButton } from '@elastic/eui';
import { OverlayStart } from '../../../src/core/public';
import { createAction } from '../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../src/plugins/kibana_react/public';

export const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

interface StartServices {
  openModal: OverlayStart['openModal'];
}

export const createHelloWorldAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    id: ACTION_HELLO_WORLD,
    type: ACTION_HELLO_WORLD,
    getDisplayName: () => 'Hello World!',
    execute: async () => {
      const { openModal } = await getStartServices();
      const overlay = openModal(
        toMountPoint(
          <EuiModalBody>
            <EuiText data-test-subj="helloWorldActionText">Hello world!</EuiText>
            <EuiButton data-test-subj="closeModal" onClick={() => overlay.close()}>
              Close
            </EuiButton>
          </EuiModalBody>
        )
      );
    },
  });
