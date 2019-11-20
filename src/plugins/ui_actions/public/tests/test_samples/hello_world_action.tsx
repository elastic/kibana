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
import { EuiFlyout } from '@elastic/eui';
import { CoreStart } from 'src/core/public';
import { createAction, IAction } from '../../actions';
import { toMountPoint } from '../../../../kibana_react/public';

export const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';

export function createHelloWorldAction(overlays: CoreStart['overlays']): IAction {
  return createAction({
    type: HELLO_WORLD_ACTION_ID,
    execute: async () => {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <EuiFlyout ownFocus onClose={() => flyoutSession && flyoutSession.close()}>
            Hello World, I am a hello world action!
          </EuiFlyout>
        ),
        {
          'data-test-subj': 'helloWorldAction',
        }
      );
    },
  });
}
