/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { createAction, IncompatibleActionError } from '../../ui_actions';
import { Embeddable, EmbeddableInput } from '../../embeddables';
import { GetMessageModal } from './get_message_modal';
import { FullNameEmbeddableOutput, hasFullNameOutput } from './say_hello_action';

export const ACTION_SEND_MESSAGE = 'ACTION_SEND_MESSAGE';

interface ActionContext {
  embeddable: Embeddable<EmbeddableInput, FullNameEmbeddableOutput>;
  message: string;
}

const isCompatible = async (context: ActionContext) => hasFullNameOutput(context.embeddable);

export function createSendMessageAction(overlays: CoreStart['overlays']) {
  const sendMessage = async (context: ActionContext, message: string) => {
    const greeting = `Hello, ${context.embeddable.getOutput().fullName}`;

    const content = message ? `${greeting}. ${message}` : greeting;
    overlays.openFlyout(toMountPoint(<EuiFlyoutBody>{content}</EuiFlyoutBody>));
  };

  return createAction<ActionContext>({
    id: ACTION_SEND_MESSAGE,
    type: ACTION_SEND_MESSAGE,
    getDisplayName: () => 'Send message',
    isCompatible,
    execute: async (context: ActionContext) => {
      if (!(await isCompatible(context))) {
        throw new IncompatibleActionError();
      }

      const modal = overlays.openModal(
        toMountPoint(
          <GetMessageModal
            onCancel={() => modal.close()}
            onDone={(message) => {
              modal.close();
              sendMessage(context, message);
            }}
          />
        )
      );
    },
  });
}
