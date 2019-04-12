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

import { EuiIcon } from '@elastic/eui';
import { ViewMode } from 'plugins/embeddable_api/types';
import React from 'react';

import { getNewPlatform } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';
import { FlyoutRef } from '../../../../../../../../core/public';
import { Action, Container, Embeddable } from '../../../../';
import { AddPanelFlyout } from './add_panel_flyout';

export const ADD_PANEL_ACTION_ID = 'ADD_PANEL_ACTION_ID';

function isContainer(embeddable: Embeddable | Container): embeddable is Container {
  return embeddable.isContainer === true;
}

export class AddPanelAction extends Action {
  private flyoutSession: FlyoutRef | undefined;
  constructor() {
    super(ADD_PANEL_ACTION_ID);
    this.priority = 8;
  }

  public getTitle() {
    return i18n.translate('kbn.embeddable.panel.addPanel.displayName', {
      defaultMessage: 'Add panel',
    });
  }

  public getIcon() {
    return <EuiIcon type="plusInCircleFilled" />;
  }

  public isCompatible({ embeddable }: { embeddable: Embeddable }) {
    return Promise.resolve(isContainer(embeddable) && embeddable.getViewMode() === ViewMode.EDIT);
  }

  public async execute({ embeddable }: { embeddable: Embeddable }) {
    if (!isContainer(embeddable) || !(await this.isCompatible({ embeddable }))) {
      throw new Error('Context is incompatible');
    }

    this.flyoutSession = getNewPlatform().start.core.overlays.openFlyout(
      <AddPanelFlyout
        container={embeddable}
        onClose={() => {
          if (this.flyoutSession) {
            this.flyoutSession.close();
          }
        }}
      />,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  }
}
