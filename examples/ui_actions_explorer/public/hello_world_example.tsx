/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiButton, EuiSpacer, EuiText, EuiModalBody, EuiLink, EuiSwitch } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { UiActionsStart, createAction } from '@kbn/ui-actions-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { HELLO_WORLD_TRIGGER_ID, ACTION_HELLO_WORLD } from '@kbn/ui-actions-examples-plugin/public';

const DYNAMIC_ACTION_ID = `${ACTION_HELLO_WORLD}-Waldo`;

interface Props {
  uiActionsStartService: UiActionsStart;
  startServices: Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
}

export const HelloWorldExample = ({ uiActionsStartService, startServices }: Props) => {
  const [isChecked, setIsChecked] = useState(false);

  const actionsMessage = isChecked ? '2 actions attached' : '1 action attached';

  return (
    <>
      <EuiText>
        <h1>Hello world example</h1>
        <p>
          The{' '}
          <EuiLink
            href="https://github.com/elastic/kibana/tree/main/examples/ui_action_examples"
            target="_blank"
          >
            ui_action_example plugin
          </EuiLink>{' '}
          registers the <em>HELLO_WORLD_TRIGGER_ID</em> trigger and attaches the{' '}
          <em>ACTION_HELLO_WORLD</em> action to the trigger. The <em>ACTION_HELLO_WORLD</em> opens a
          modal when executed. Fire the &quot;Hello world&quot; event by clicking the button below.
        </p>
      </EuiText>
      <EuiButton
        data-test-subj="emitHelloWorldTrigger"
        onClick={() => uiActionsStartService.getTrigger(HELLO_WORLD_TRIGGER_ID).exec({})}
      >
        Click me to fire &quot;Hello world&quot; event ({actionsMessage})
      </EuiButton>

      <EuiSpacer />

      <EuiText>
        <p>
          You can dynamically add a new action to a trigger. Click the switch below to attach a
          second action to <em>HELLO_WORLD_TRIGGER_ID</em> trigger. What do you think will happen
          when you click the button and the trigger has multiple actions?
        </p>
        <EuiSwitch
          data-test-subj="addDynamicAction"
          label={'Attach second action to "Hello world" event'}
          checked={isChecked}
          onChange={(e) => {
            setIsChecked(e.target.checked);
            if (e.target.checked) {
              const dynamicAction = createAction({
                id: DYNAMIC_ACTION_ID,
                type: ACTION_HELLO_WORLD,
                getDisplayName: () => 'Say hello to Waldo',
                execute: async () => {
                  const overlay = startServices.overlays.openModal(
                    toMountPoint(
                      <EuiModalBody>
                        <EuiText data-test-subj="dynamicHelloWorldActionText">Hello Waldo</EuiText>{' '}
                        <EuiButton data-test-subj="closeModal" onClick={() => overlay.close()}>
                          Close
                        </EuiButton>
                      </EuiModalBody>,
                      startServices
                    )
                  );
                },
              });
              uiActionsStartService.addTriggerAction(HELLO_WORLD_TRIGGER_ID, dynamicAction);
            } else {
              uiActionsStartService.detachAction(HELLO_WORLD_TRIGGER_ID, DYNAMIC_ACTION_ID);
            }
          }}
        />
      </EuiText>
    </>
  );
};
