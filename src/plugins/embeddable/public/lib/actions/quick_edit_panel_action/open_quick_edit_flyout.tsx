/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { toMountPoint } from '../../../../../kibana_react/public';
import { QuickEditFlyout } from '../../../components/quick_edit_flyout';
import { IEmbeddable, EmbeddableStateTransfer } from '../..';

export async function openQuickEditFlyout(options: {
  embeddable: IEmbeddable;
  overlays: CoreStart['overlays'];
  application: CoreStart['application'];
  stateTransferService?: EmbeddableStateTransfer;
}) {
  const { embeddable, overlays, application, stateTransferService } = options;

  const initialInput = embeddable.getInput();

  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <QuickEditFlyout
        embeddable={embeddable}
        application={application}
        stateTransferService={stateTransferService}
        onClose={() => {
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        onCancel={() => {
          // Restore embeddable state if we cancel
          embeddable.updateInput(initialInput);
          embeddable.reload();
        }}
      />
    ),
    {
      'data-test-subj': 'dashboardQuickEditPanelFlyout',
      ownFocus: true,
      hideCloseButton: true,
    }
  );
}
