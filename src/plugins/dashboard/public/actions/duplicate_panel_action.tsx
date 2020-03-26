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
import {
  VisualizeEmbeddable,
  VisualizeInput,
} from '../../../../legacy/core_plugins/visualizations/public/np_ready/public/embeddable';
import { ActionByType, IncompatibleActionError } from '../ui_actions_plugin';
import { ViewMode, IContainer, PanelState } from '../embeddable_plugin';
import { SavedObject } from '../../../saved_objects/public';
import { DashboardPanelState, GridData } from '..';

export const ACTION_DUPLICATE_PANEL = 'duplicatePanel';

export interface DuplicatePanelActionContext {
  embeddable: VisualizeEmbeddable;
}

export class DuplicatePanelAction implements ActionByType<typeof ACTION_DUPLICATE_PANEL> {
  public readonly type = ACTION_DUPLICATE_PANEL;
  public readonly id = ACTION_DUPLICATE_PANEL;
  public order = 11;

  constructor(private core: CoreStart) {}

  public getDisplayName({ embeddable }: DuplicatePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.panel.duplicatePanel', {
      defaultMessage: 'Duplicate panel',
    });
  }

  public getIconType({ embeddable }: DuplicatePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'copy';
  }

  public async isCompatible({ embeddable }: DuplicatePanelActionContext) {
    if (embeddable.getInput().viewMode) {
      if (embeddable.getInput().viewMode === ViewMode.VIEW) {
        return false;
      }
    }

    return Boolean(embeddable.getRoot() && embeddable.getRoot().isContainer);
  }

  public async execute({ embeddable }: DuplicatePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }

    const dashboard = embeddable.getRoot() as IContainer;
    const panelToDuplicate = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;

    if (!panelToDuplicate || !panelToDuplicate.savedObjectId) {
      throw new TypeError('attempt to duplicate panel without a saved object ID');
    } else {
      // Fetch existing saved object
      const savedObjectToDuplicate = await this.core.savedObjects.client.get<SavedObject>(
        embeddable.type,
        panelToDuplicate.savedObjectId
      );

      // Create the duplicate saved object
      const newTitle = await this.getUniqueTitle(
        savedObjectToDuplicate.attributes.title,
        embeddable.type
      );
      const duplicatedSavedObject = await this.core.savedObjects.client.create(
        embeddable.type,
        {
          ..._.cloneDeep(savedObjectToDuplicate.attributes),
          title: newTitle,
        },
        { references: _.cloneDeep(savedObjectToDuplicate.references) }
      );

      // Create duplicate embeddable
      const duplicatedEmbeddable = await dashboard.addSavedObjectEmbeddable(
        embeddable.type,
        duplicatedSavedObject.id
      );
      duplicatedEmbeddable.updateInput({ vis: embeddable.getInput().vis } as VisualizeInput);

      // Place duplicated panel
      const finalPanels = _.cloneDeep(dashboard.getInput().panels);
      const duplicatedPanel = finalPanels[duplicatedEmbeddable.id] as DashboardPanelState;
      this.placeDuplicatedPanelInDashboard(finalPanels, panelToDuplicate, duplicatedPanel);

      this.core.notifications.toasts.addSuccess({
        title: i18n.translate('dashboard.panel.duplicationSuccessMessage', {
          defaultMessage: 'Added duplicate panel {newTitle}',
          values: {
            newTitle,
          },
        }),
        'data-test-subj': 'panelDuplicateSuccess',
      });
      dashboard.updateInput({ panels: finalPanels });
      dashboard.reload();
    }
  }

  private async getUniqueTitle(rawTitle: string, embeddableType: string): Promise<string> {
    const duplicatedTag = i18n.translate('dashboard.panel.title.duplicatedTag', {
      defaultMessage: 'copy',
    });
    const duplicationRegex = new RegExp(`\\(${duplicatedTag}\\)`, 'g');
    const duplicationNumberRegex = new RegExp(`\\(${duplicatedTag} [0-9]+\\)`, 'g');
    const baseTitle = rawTitle.replace(duplicationNumberRegex, '').replace(duplicationRegex, '');

    const similarSavedObjects = await this.core.savedObjects.client.find<SavedObject>({
      type: embeddableType,
      perPage: 0,
      fields: ['title'],
      searchFields: ['title'],
      search: `"${baseTitle}"`,
    });
    const similarBaseTitlesCount: number = similarSavedObjects.total - 1;

    return similarBaseTitlesCount <= 0
      ? baseTitle + ` (${duplicatedTag})`
      : baseTitle + ` (${duplicatedTag} ${similarBaseTitlesCount})`;
  }

  private placeDuplicatedPanelInDashboard(
    finalPanels: { [key: string]: PanelState<{ [id: string]: unknown } & { id: string }> },
    panelToDuplicate: DashboardPanelState,
    duplicatedPanel: DashboardPanelState
  ) {
    const duplicatedPanelGrid = duplicatedPanel.gridData;
    duplicatedPanelGrid.x = panelToDuplicate.gridData.x + panelToDuplicate.gridData.w;
    duplicatedPanelGrid.y = panelToDuplicate.gridData.y;
    duplicatedPanelGrid.w = panelToDuplicate.gridData.w;
    duplicatedPanelGrid.h = panelToDuplicate.gridData.h;

    // Adjust flow of dashboard if necessary
    const otherPanels: GridData[] = [];
    _.forOwn(finalPanels, (panel: DashboardPanelState) => {
      if (
        panel.savedObjectId !== duplicatedPanel.savedObjectId &&
        panel.savedObjectId !== panelToDuplicate.savedObjectId
      ) {
        otherPanels.push(panel.gridData);
      }
    });

    const intersection = otherPanels.some((currentPanelGrid: GridData) => {
      return (
        duplicatedPanelGrid.x + duplicatedPanelGrid.w > currentPanelGrid.x &&
        duplicatedPanelGrid.x < currentPanelGrid.x + currentPanelGrid.w &&
        duplicatedPanelGrid.y < currentPanelGrid.y + currentPanelGrid.h &&
        duplicatedPanelGrid.y + duplicatedPanelGrid.h > currentPanelGrid.y
      );
    });

    // if any other panel intersects with the newly duplicated panel, move all panels in the same 'row' to the right by the amount of the duplciated panel's width
    if (intersection) {
      otherPanels.forEach((currentPanelGrid: GridData) => {
        if (
          currentPanelGrid.x >= duplicatedPanelGrid.x &&
          duplicatedPanelGrid.y <= currentPanelGrid.y + currentPanelGrid.h &&
          duplicatedPanelGrid.y + duplicatedPanelGrid.h >= currentPanelGrid.y
        ) {
          currentPanelGrid.x += duplicatedPanelGrid.w;
        }
      });
    }
  }
}
