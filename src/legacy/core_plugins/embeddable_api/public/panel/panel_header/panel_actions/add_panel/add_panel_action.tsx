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
import React from 'react';

import { i18n } from '@kbn/i18n';
import { ViewMode } from '../../../../types';
import { Action, ActionContext } from '../../../../actions';
import { openAddPanelFlyout } from './open_add_panel_flyout';

export const ADD_PANEL_ACTION_ID = 'ADD_PANEL_ACTION_ID';

export class AddPanelAction extends Action {
  public readonly type = ADD_PANEL_ACTION_ID;

  constructor() {
    super(ADD_PANEL_ACTION_ID);
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.addPanel.displayName', {
      defaultMessage: 'Add panel',
    });
  }

  public getIcon() {
    return <EuiIcon type="plusInCircleFilled" />;
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return embeddable.getIsContainer() && embeddable.getInput().viewMode === ViewMode.EDIT;
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.getIsContainer() || !(await this.isCompatible({ embeddable }))) {
      throw new Error('Context is incompatible');
    }

    openAddPanelFlyout(embeddable);
  }
}
