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
import { ViewMode, IContainer } from '../embeddable_plugin';
import { VisSavedObject } from '../../../../legacy/core_plugins/visualizations/public';
import { DashboardPanelState } from '..';

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
    const originalPanels = dashboard.getInput().panels;
    const panelToDuplicate = originalPanels[embeddable.id] as DashboardPanelState;

    if (!panelToDuplicate.savedObjectId) {
      throw new TypeError('attempt to duplicate panel without a saved object ID');
    } else {
      // Duplicate saved Object
      const savedObjectToDuplicate = await this.core.savedObjects.client.get<VisSavedObject>(
        embeddable.type,
        panelToDuplicate.savedObjectId
      );

      const duplicationAppend = i18n.translate('dashboard.panel.title.duplicatedAppendMessage', {
        defaultMessage: '- copy',
      });
      const newTitle = savedObjectToDuplicate.attributes.title + duplicationAppend;
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
      duplicatedPanel.gridData.w = panelToDuplicate.gridData.w;
      duplicatedPanel.gridData.h = panelToDuplicate.gridData.h;
      duplicatedPanel.gridData.x = panelToDuplicate.gridData.x + panelToDuplicate.gridData.w;
      duplicatedPanel.gridData.y = panelToDuplicate.gridData.y;

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
}
