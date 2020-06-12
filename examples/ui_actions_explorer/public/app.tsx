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

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { EuiPage } from '@elastic/eui';

import { EuiButton } from '@elastic/eui';
import { EuiPageBody } from '@elastic/eui';
import { EuiPageContent } from '@elastic/eui';
import { EuiPageContentBody } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { EuiPageHeader } from '@elastic/eui';
import { EuiModalBody } from '@elastic/eui';
import { toMountPoint } from '../../../src/plugins/kibana_react/public';
import { UiActionsStart, createAction } from '../../../src/plugins/ui_actions/public';
import { AppMountParameters, OverlayStart } from '../../../src/core/public';
import { HELLO_WORLD_TRIGGER_ID, ACTION_HELLO_WORLD } from '../../ui_action_examples/public';
import { TriggerContextExample } from './trigger_context_example';

interface Props {
  uiActionsApi: UiActionsStart;
  openModal: OverlayStart['openModal'];
}

const ActionsExplorer = ({ uiActionsApi, openModal }: Props) => {
  const [name, setName] = useState('Waldo');
  const [confirmationText, setConfirmationText] = useState('');
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>Ui Actions Explorer</EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiText>
              <p>
                By default there is a single action attached to the `HELLO_WORLD_TRIGGER`. Clicking
                this button will cause it to be executed immediately.
              </p>
            </EuiText>
            <EuiButton
              data-test-subj="emitHelloWorldTrigger"
              onClick={() => uiActionsApi.executeTriggerActions(HELLO_WORLD_TRIGGER_ID, {})}
            >
              Say hello world!
            </EuiButton>

            <EuiText>
              <p>
                Lets dynamically add new actions to this trigger. After you click this button, click
                the above button again. This time it should offer you multiple options to choose
                from. Using the UI Action and Trigger API makes your plugin extensible by other
                plugins. Any actions attached to the `HELLO_WORLD_TRIGGER_ID` will show up here!
              </p>
              <EuiFieldText prepend="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <EuiButton
                data-test-subj="addDynamicAction"
                onClick={() => {
                  const dynamicAction = createAction<typeof ACTION_HELLO_WORLD>({
                    id: `${ACTION_HELLO_WORLD}-${name}`,
                    type: ACTION_HELLO_WORLD,
                    getDisplayName: () => `Say hello to ${name}`,
                    execute: async () => {
                      const overlay = openModal(
                        toMountPoint(
                          <EuiModalBody>
                            <EuiText data-test-subj="dynamicHelloWorldActionText">
                              {`Hello ${name}`}
                            </EuiText>{' '}
                            <EuiButton data-test-subj="closeModal" onClick={() => overlay.close()}>
                              Close
                            </EuiButton>
                          </EuiModalBody>
                        )
                      );
                    },
                  });
                  uiActionsApi.addTriggerAction(HELLO_WORLD_TRIGGER_ID, dynamicAction);
                  setConfirmationText(
                    `You've successfully added a new action: ${dynamicAction.getDisplayName(
                      {}
                    )}. Refresh the page to reset state.  It's up to the user of the system to persist state like this.`
                  );
                }}
              >
                Say hello to me!
              </EuiButton>
              {confirmationText !== '' ? <EuiCallOut>{confirmationText}</EuiCallOut> : undefined}
            </EuiText>

            <EuiSpacer />
            <TriggerContextExample uiActionsApi={uiActionsApi} />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ActionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
