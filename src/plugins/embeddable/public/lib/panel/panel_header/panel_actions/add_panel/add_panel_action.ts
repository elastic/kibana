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
import { IAction } from 'src/plugins/ui_actions/public';
import { NotificationsStart, OverlayStart } from 'src/core/public';
import { ViewMode, GetEmbeddableFactory, GetEmbeddableFactories } from '../../../../types';
import { openAddPanelFlyout } from './open_add_panel_flyout';
import { IContainer } from '../../../../containers';

export const ADD_PANEL_ACTION_ID = 'ADD_PANEL_ACTION_ID';

interface ActionContext {
  embeddable: IContainer;
}

export class AddPanelAction implements IAction<ActionContext> {
  public readonly type = ADD_PANEL_ACTION_ID;
  public readonly id = ADD_PANEL_ACTION_ID;

  constructor(
    private readonly getFactory: GetEmbeddableFactory,
    private readonly getAllFactories: GetEmbeddableFactories,
    private readonly overlays: OverlayStart,
    private readonly notifications: NotificationsStart,
    private readonly SavedObjectFinder: React.ComponentType<any>
  ) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.addPanel.displayName', {
      defaultMessage: 'Add panel',
    });
  }

  public getIconType() {
    return 'plusInCircleFilled';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return embeddable.getIsContainer() && embeddable.getInput().viewMode === ViewMode.EDIT;
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.getIsContainer() || !(await this.isCompatible({ embeddable }))) {
      throw new Error('Context is incompatible');
    }

    openAddPanelFlyout({
      embeddable,
      getFactory: this.getFactory,
      getAllFactories: this.getAllFactories,
      overlays: this.overlays,
      notifications: this.notifications,
      SavedObjectFinder: this.SavedObjectFinder,
    });
  }
}
