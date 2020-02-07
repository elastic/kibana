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
import { CoreStart } from '../../../../core/public';
import { toMountPoint } from '../../../../plugins/kibana_react/public';
import { ReplacePanelFlyout } from './replace_panel_flyout';
import {
  IEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddableStart,
  IContainer,
} from '../embeddable_plugin';

export async function openReplacePanelFlyout(options: {
  embeddable: IContainer;
  core: CoreStart;
  savedObjectFinder: React.ComponentType<any>;
  notifications: CoreStart['notifications'];
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getEmbeddableFactories: IEmbeddableStart['getEmbeddableFactories'];
}) {
  const {
    embeddable,
    core,
    panelToRemove,
    savedObjectFinder,
    notifications,
    getEmbeddableFactories,
  } = options;
  const flyoutSession = core.overlays.openFlyout(
    toMountPoint(
      <ReplacePanelFlyout
        container={embeddable}
        onClose={() => {
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        panelToRemove={panelToRemove}
        savedObjectsFinder={savedObjectFinder}
        notifications={notifications}
        getEmbeddableFactories={getEmbeddableFactories}
      />
    ),
    {
      'data-test-subj': 'replacePanelFlyout',
    }
  );
}
