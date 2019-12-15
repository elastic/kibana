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
import { CoreStart } from '../../../../core/public';
import { IEmbeddable, ViewMode, IEmbeddableStart } from '../embeddable_plugin';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';
import { IAction, IncompatibleActionError } from '../ui_actions_plugin';
import { openReplacePanelFlyout } from './open_replace_panel_flyout';

export const REPLACE_PANEL_ACTION = 'replacePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

interface ActionContext {
  embeddable: IEmbeddable;
}

export class ReplacePanelAction implements IAction<ActionContext> {
  public readonly type = REPLACE_PANEL_ACTION;
  public readonly id = REPLACE_PANEL_ACTION;
  public order = 11;

  constructor(
    private core: CoreStart,
    private savedobjectfinder: React.ComponentType<any>,
    private notifications: CoreStart['notifications'],
    private getEmbeddableFactories: IEmbeddableStart['getEmbeddableFactories']
  ) {}

  public getDisplayName({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboardEmbeddableContainer.panel.removePanel.replacePanel', {
      defaultMessage: 'Replace panel',
    });
  }

  public getIconType({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'kqlOperand';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    if (embeddable.getInput().viewMode) {
      if (embeddable.getInput().viewMode === ViewMode.VIEW) {
        return false;
      }
    }

    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    const view = embeddable;
    const dash = embeddable.parent;
    openReplacePanelFlyout({
      embeddable: dash,
      core: this.core,
      savedObjectFinder: this.savedobjectfinder,
      notifications: this.notifications,
      panelToRemove: view,
      getEmbeddableFactories: this.getEmbeddableFactories,
    });
  }
}
