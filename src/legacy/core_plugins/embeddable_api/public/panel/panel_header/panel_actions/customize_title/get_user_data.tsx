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
import { getNewPlatform } from 'ui/new_platform';
import { ExecuteActionContext } from 'plugins/embeddable_api/actions';
import { CustomizePanelFlyout } from './customize_panel_flyout';

export async function getUserData(context: ExecuteActionContext) {
  return new Promise<{ title: string | undefined }>(resolve => {
    getNewPlatform().start.core.overlays.openFlyout(
      <CustomizePanelFlyout
        embeddable={context.embeddable}
        updateTitle={title => resolve({ title })}
      />,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  });
}
