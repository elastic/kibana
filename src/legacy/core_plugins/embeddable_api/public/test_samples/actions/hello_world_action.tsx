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

import { npStart } from 'ui/new_platform';
import { EuiFlyout } from '@elastic/eui';
import { Action, actionRegistry, triggerRegistry, CONTEXT_MENU_TRIGGER } from '../..';

import { attachAction } from '../../triggers/attach_action';

export const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';

export class HelloWorldAction extends Action {
  public readonly type = HELLO_WORLD_ACTION_ID;
  constructor() {
    super(HELLO_WORLD_ACTION_ID);
  }

  public getDisplayName() {
    return 'Hello World Action!';
  }

  public execute() {
    const flyoutSession = npStart.core.overlays.openFlyout(
      <EuiFlyout ownFocus onClose={() => flyoutSession && flyoutSession.close()}>
        Hello World, I am a hello world action!
      </EuiFlyout>,
      {
        'data-test-subj': 'helloWorldAction',
      }
    );
  }
}

actionRegistry.set(HELLO_WORLD_ACTION_ID, new HelloWorldAction());

// Attaching to CONTEXT_MENU_TRIGGER makes this action appear in the context menu for
// all embeddables.
attachAction(triggerRegistry, {
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: HELLO_WORLD_ACTION_ID,
});
