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

import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '../../embeddable_plugin';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';

export const ACTION_EXPAND_PANEL = 'togglePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

function isExpanded(embeddable: IEmbeddable) {
  if (!embeddable.parent || !isDashboard(embeddable.parent)) {
    throw new IncompatibleActionError();
  }

  return embeddable.id === embeddable.parent.getInput().expandedPanelId;
}

export interface ExpandPanelActionContext {
  embeddable: IEmbeddable;
}

export class ExpandPanelAction implements ActionByType<typeof ACTION_EXPAND_PANEL> {
  public readonly type = ACTION_EXPAND_PANEL;
  public readonly id = ACTION_EXPAND_PANEL;
  public order = 7;

  constructor() {}

  public getDisplayName({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    return isExpanded(embeddable)
      ? i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
          defaultMessage: 'Minimize',
        })
      : i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.notExpandedDisplayName', {
          defaultMessage: 'Maximize panel',
        });
  }

  public getIconType({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    // TODO: use 'minimize' when an eui-icon of such is available.
    return isExpanded(embeddable) ? 'expand' : 'expand';
  }

  public async isCompatible({ embeddable }: ExpandPanelActionContext) {
    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const newValue = isExpanded(embeddable) ? undefined : embeddable.id;
    embeddable.parent.updateInput({
      expandedPanelId: newValue,
    });
  }
}
