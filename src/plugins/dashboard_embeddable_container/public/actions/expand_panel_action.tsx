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
import { IEmbeddable } from '../embeddable_plugin';
import { IAction, IncompatibleActionError } from '../ui_actions_plugin';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';

export const EXPAND_PANEL_ACTION = 'togglePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

function isExpanded(embeddable: IEmbeddable) {
  if (!embeddable.parent || !isDashboard(embeddable.parent)) {
    throw new IncompatibleActionError();
  }

  return embeddable.id === embeddable.parent.getInput().expandedPanelId;
}

interface ActionContext {
  embeddable: IEmbeddable;
}

export class ExpandPanelAction implements IAction<ActionContext> {
  public readonly type = EXPAND_PANEL_ACTION;
  public readonly id = EXPAND_PANEL_ACTION;
  public order = 7;

  constructor() {}

  public getDisplayName({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    return isExpanded(embeddable)
      ? i18n.translate(
          'dashboardEmbeddableContainer.actions.toggleExpandPanelMenuItem.expandedDisplayName',
          {
            defaultMessage: 'Minimize',
          }
        )
      : i18n.translate(
          'dashboardEmbeddableContainer.actions.toggleExpandPanelMenuItem.notExpandedDisplayName',
          {
            defaultMessage: 'Full screen',
          }
        );
  }

  public getIconType({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    // TODO: use 'minimize' when an eui-icon of such is available.
    return isExpanded(embeddable) ? 'expand' : 'expand';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const newValue = isExpanded(embeddable) ? undefined : embeddable.id;
    embeddable.parent.updateInput({
      expandedPanelId: newValue,
    });
  }
}
