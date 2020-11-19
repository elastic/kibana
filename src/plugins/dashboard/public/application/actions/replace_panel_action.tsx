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
import { CoreStart } from 'src/core/public';
import { IEmbeddable, ViewMode, EmbeddableStart } from '../../embeddable_plugin';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { openReplacePanelFlyout } from './open_replace_panel_flyout';

export const ACTION_REPLACE_PANEL = 'replacePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export interface ReplacePanelActionContext {
  embeddable: IEmbeddable;
}

export class ReplacePanelAction implements ActionByType<typeof ACTION_REPLACE_PANEL> {
  public readonly type = ACTION_REPLACE_PANEL;
  public readonly id = ACTION_REPLACE_PANEL;
  public order = 3;

  constructor(
    private core: CoreStart,
    private savedobjectfinder: React.ComponentType<any>,
    private notifications: CoreStart['notifications'],
    private getEmbeddableFactories: EmbeddableStart['getEmbeddableFactories']
  ) {}

  public getDisplayName({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.panel.removePanel.replacePanel', {
      defaultMessage: 'Replace panel',
    });
  }

  public getIconType({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'kqlOperand';
  }

  public async isCompatible({ embeddable }: ReplacePanelActionContext) {
    if (embeddable.getInput().viewMode) {
      if (embeddable.getInput().viewMode === ViewMode.VIEW) {
        return false;
      }
    }

    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ReplacePanelActionContext) {
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
