/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { Action, IncompatibleActionError } from '../..';
import { Embeddable, EmbeddableInput } from '../../embeddables';
import { GetMessageModal } from './get_message_modal';
import { FullNameEmbeddableOutput, hasFullNameOutput } from './say_hello_action';
import { CoreStart } from '../../../../../../../../../core/public';

export const SEND_MESSAGE_ACTION = 'SEND_MESSAGE_ACTION';

interface ActionContext {
  embeddable: Embeddable<EmbeddableInput, FullNameEmbeddableOutput>;
  message: string;
}
export class SendMessageAction extends Action {
  public readonly type = SEND_MESSAGE_ACTION;

  constructor(private readonly overlays: CoreStart['overlays']) {
    super(SEND_MESSAGE_ACTION);
  }

  getDisplayName() {
    return 'Send message';
  }

  async isCompatible(context: ActionContext) {
    return hasFullNameOutput(context.embeddable);
  }

  async sendMessage(context: ActionContext, message: string) {
    const greeting = `Hello, ${context.embeddable.getOutput().fullName}`;

    const content = message ? `${greeting}. ${message}` : greeting;
    this.overlays.openFlyout(<EuiFlyoutBody>{content}</EuiFlyoutBody>);
  }

  async execute(context: ActionContext) {
    if (!(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }

    const modal = this.overlays.openModal(
      <GetMessageModal
        onCancel={() => modal.close()}
        onDone={message => {
          modal.close();
          this.sendMessage(context, message);
        }}
      />
    );
  }
}
