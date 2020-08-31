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
import { Action, ActionExecutionContext } from 'src/plugins/ui_actions/public';
import { NotificationsStart, OverlayStart } from 'src/core/public';
import { EmbeddableStart } from 'src/plugins/embeddable/public/plugin';
import { ViewMode } from '../../../../types';
import { openAddPanelFlyout } from './open_add_panel_flyout';
import { IContainer } from '../../../../containers';

export const ACTION_ADD_PANEL = 'ACTION_ADD_PANEL';

interface ActionContext {
  embeddable: IContainer;
}

export class AddPanelAction implements Action<ActionContext> {
  public readonly type = ACTION_ADD_PANEL;
  public readonly id = ACTION_ADD_PANEL;

  constructor(
    private readonly getFactory: EmbeddableStart['getEmbeddableFactory'],
    private readonly getAllFactories: EmbeddableStart['getEmbeddableFactories'],
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

  public async isCompatible(context: ActionExecutionContext<ActionContext>) {
    const { embeddable } = context;
    return embeddable.getIsContainer() && embeddable.getInput().viewMode === ViewMode.EDIT;
  }

  public async execute(context: ActionExecutionContext<ActionContext>) {
    const { embeddable } = context;
    if (!embeddable.getIsContainer() || !(await this.isCompatible(context))) {
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
