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
import uuid from 'uuid';
import _ from 'lodash';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { ViewMode, PanelState, IEmbeddable } from '../../embeddable_plugin';
import { SavedObject } from '../../../../saved_objects/public';
import { PanelNotFoundError, EmbeddableInput } from '../../../../embeddable/public';
import {
  placePanelBeside,
  IPanelPlacementBesideArgs,
} from '../embeddable/panel/dashboard_panel_placement';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '..';

export const ACTION_CLONE_PANEL = 'clonePanel';

export interface ClonePanelActionContext {
  embeddable: IEmbeddable;
}

export class ClonePanelAction implements ActionByType<typeof ACTION_CLONE_PANEL> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  constructor(private core: CoreStart) {}

  public getDisplayName({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.panel.clonePanel', {
      defaultMessage: 'Clone panel',
    });
  }

  public getIconType({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'copy';
  }

  public async isCompatible({ embeddable }: ClonePanelActionContext) {
    return Boolean(
      embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE
    );
  }

  public async execute({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToClone = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToClone) {
      throw new PanelNotFoundError();
    }

    dashboard.showPlaceholderUntil(
      this.cloneEmbeddable(panelToClone, embeddable.type),
      placePanelBeside,
      {
        width: panelToClone.gridData.w,
        height: panelToClone.gridData.h,
        currentPanels: dashboard.getInput().panels,
        placeBesideId: panelToClone.explicitInput.id,
      } as IPanelPlacementBesideArgs
    );
  }

  private async getUniqueTitle(rawTitle: string, embeddableType: string): Promise<string> {
    const clonedTag = i18n.translate('dashboard.panel.title.clonedTag', {
      defaultMessage: 'copy',
    });
    const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
    const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
    const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();

    const similarSavedObjects = await this.core.savedObjects.client.find<SavedObject>({
      type: embeddableType,
      perPage: 0,
      fields: ['title'],
      searchFields: ['title'],
      search: `"${baseTitle}"`,
    });
    const similarBaseTitlesCount: number = similarSavedObjects.total - 1;

    return similarBaseTitlesCount <= 0
      ? baseTitle + ` (${clonedTag})`
      : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount})`;
  }

  private async cloneEmbeddable(
    panelToClone: DashboardPanelState,
    embeddableType: string
  ): Promise<Partial<PanelState>> {
    const panelState: PanelState<EmbeddableInput> = {
      type: embeddableType,
      explicitInput: {
        ...panelToClone.explicitInput,
        id: uuid.v4(),
      },
    };
    let newTitle: string = '';
    if (panelToClone.explicitInput.savedObjectId) {
      // Fetch existing saved object
      const savedObjectToClone = await this.core.savedObjects.client.get<SavedObject>(
        embeddableType,
        panelToClone.explicitInput.savedObjectId
      );

      // Clone the saved object
      newTitle = await this.getUniqueTitle(savedObjectToClone.attributes.title, embeddableType);
      const clonedSavedObject = await this.core.savedObjects.client.create(
        embeddableType,
        {
          ..._.cloneDeep(savedObjectToClone.attributes),
          title: newTitle,
        },
        { references: _.cloneDeep(savedObjectToClone.references) }
      );
      panelState.explicitInput.savedObjectId = clonedSavedObject.id;
    }
    this.core.notifications.toasts.addSuccess({
      title: i18n.translate('dashboard.panel.clonedToast', {
        defaultMessage: 'Cloned panel',
      }),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
    return panelState;
  }
}
