/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { UiActionsStart, createAction } from '@kbn/ui-actions-plugin/public';
import { AppMountParameters, OverlayStart } from '@kbn/core/public';
import { HELLO_WORLD_TRIGGER_ID, ACTION_HELLO_WORLD } from '@kbn/ui-actions-examples-plugin/public';
import { TriggerContextExample } from './trigger_context_example';
import { ContextMenuExamples } from './context_menu_examples';

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
                  const dynamicAction = createAction({
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
                    `You've successfully added a new action: ${dynamicAction.getDisplayName({
                      trigger: uiActionsApi.getTrigger(HELLO_WORLD_TRIGGER_ID),
                    })}. Refresh the page to reset state.  It's up to the user of the system to persist state like this.`
                  );
                }}
              >
                Say hello to me!
              </EuiButton>
              {confirmationText !== '' ? <EuiCallOut>{confirmationText}</EuiCallOut> : undefined}
            </EuiText>

            <EuiSpacer />

            <TriggerContextExample uiActionsApi={uiActionsApi} />

            <EuiSpacer />

            <ContextMenuExamples />
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
