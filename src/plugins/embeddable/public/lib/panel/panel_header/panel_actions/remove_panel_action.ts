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
import { IAction, IncompatibleActionError } from '../../../ui_actions';
import { ContainerInput, IContainer } from '../../../containers';
import { ViewMode } from '../../../types';
import { IEmbeddable } from '../../../embeddables';

export const REMOVE_PANEL_ACTION = 'deletePanel';

interface ExpandedPanelInput extends ContainerInput {
  expandedPanelId: string;
}

interface ActionContext {
  embeddable: IEmbeddable;
}

function hasExpandedPanelInput(
  container: IContainer
): container is IContainer<{}, ExpandedPanelInput> {
  return (container as IContainer<{}, ExpandedPanelInput>).getInput().expandedPanelId !== undefined;
}

export class RemovePanelAction implements IAction<ActionContext> {
  public readonly type = REMOVE_PANEL_ACTION;
  public readonly id = REMOVE_PANEL_ACTION;
  public order = 5;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIconType() {
    return 'trash';
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
    if (!embeddable.parent || !(await this.isCompatible({ embeddable }))) {
      throw new IncompatibleActionError();
    }
    embeddable.parent.removeEmbeddable(embeddable.id);
  }
}
