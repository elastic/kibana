/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText, EuiModalBody, EuiButton } from '@elastic/eui';
import { OverlayStart } from '@kbn/core/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

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
