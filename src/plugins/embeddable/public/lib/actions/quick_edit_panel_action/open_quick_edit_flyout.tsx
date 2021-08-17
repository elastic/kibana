/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { take } from 'rxjs/operators';
import { CoreStart } from 'src/core/public';
import { toMountPoint } from '../../../../../kibana_react/public';
import { QuickEditFlyout } from '../../../components/quick_edit_flyout';
import { goToApp } from '../../go_to_app';
import { EmbeddableInput, IEmbeddable, EmbeddableStateTransfer } from '../..';

export async function openQuickEditFlyout(options: {
  embeddable: IEmbeddable;
  overlays: CoreStart['overlays'];
  application: CoreStart['application'];
  stateTransferService?: EmbeddableStateTransfer;
}) {
  const { embeddable, overlays, application, stateTransferService } = options;

  let element;
  let onSave = () => ({});
  let onOpen = () => {};
  let onClose = () => {};

  if (embeddable.getQuickEditor) {
    const editor = await embeddable.getQuickEditor();
    element = editor?.element;
    onSave = editor?.onSave || (() => ({}));

    onOpen = editor?.onOpen || onOpen;
    onClose = editor?.onClose || onClose;
  }

  let currentAppId: string | undefined;
  if (application?.currentAppId$) {
    application.currentAppId$
      .pipe(take(1))
      .subscribe((appId: string | undefined) => (currentAppId = appId));
  }

  const initialInput = embeddable.getInput();

  // Call the open callback
  onOpen();

  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <QuickEditFlyout
        embeddable={embeddable}
        editorElement={element}
        onCancel={() => {
          // Restore embeddable state if we cancel
          embeddable.updateInput(initialInput);
          embeddable.reload();

          onClose();
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        onSave={(newState: Partial<EmbeddableInput>) => {
          embeddable.updateInput({ ...onSave(), ...newState });

          onClose();
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        goToApp={() => {
          // Restore embeddable to original state before navigating away
          embeddable.updateInput(initialInput);

          goToApp(embeddable, currentAppId || '', { stateTransferService, application });

          onClose();
          if (flyoutSession) {
            flyoutSession.close();
          }
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
