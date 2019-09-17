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
import { ContainerInput, IContainer } from '../../../containers';
import { ViewMode, GetEmbeddableFactory, GetEmbeddableFactories } from '../../../types';
import { Action, ActionContext } from '../../../actions';
import { NotificationsStart } from '../../../../../../../../../../core/public';
import { KibanaReactOverlays } from '../../../../../../../../../../plugins/kibana_react/public';
import { openChangeViewFlyout } from '../../../panel/panel_header/panel_actions/add_panel/open_change_view_flyout';

export const CHANGE_VIEW_ACTION = 'changeView';

interface ExpandedPanelInput extends ContainerInput {
  expandedPanelId: string;
}

function hasExpandedPanelInput(
  container: IContainer
): container is IContainer<{}, ExpandedPanelInput> {
  return (container as IContainer<{}, ExpandedPanelInput>).getInput().expandedPanelId !== undefined;
}

export class ChangeViewAction extends Action {
  public readonly type = CHANGE_VIEW_ACTION;
  constructor(
    private readonly getFactory: GetEmbeddableFactory,
    private readonly getAllFactories: GetEmbeddableFactories,
    private readonly overlays: KibanaReactOverlays,
    private readonly notifications: NotificationsStart,
    private readonly SavedObjectFinder: React.ComponentType<any>
  ) {
    super(CHANGE_VIEW_ACTION);
    this.order = 11;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.removePanel.replaceView', {
      defaultMessage: 'Replace visualization',
    });
  }

  public getIconType() {
    return 'kqlOperand';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isPanelExpanded =
      embeddable.parent &&
      hasExpandedPanelInput(embeddable.parent) &&
      embeddable.parent.getInput().expandedPanelId === embeddable.id;

    return Boolean(
      embeddable.parent && embeddable.getInput().viewMode === ViewMode.EDIT && !isPanelExpanded
    );
  }

  public async execute({ embeddable }: ActionContext) {
    if (embeddable.parent) {
      const view = embeddable;
      const dash = embeddable.parent;

      if (dash) {
        if (!dash.getIsContainer()) {
          throw new Error('Context is incompatible');
        }

        if (embeddable) {
          openChangeViewFlyout({
            embeddable: dash,
            getFactory: this.getFactory,
            getAllFactories: this.getAllFactories,
            overlays: this.overlays,
            notifications: this.notifications,
            SavedObjectFinder: this.SavedObjectFinder,
            viewToRemove: view,
          });
        }
      }
    }
  }
}
