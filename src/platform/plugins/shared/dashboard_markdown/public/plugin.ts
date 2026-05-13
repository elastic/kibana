/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementPublicSetup } from '@kbn/content-management-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public/plugin';
import { ADD_PANEL_TRIGGER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import {
  APP_ICON,
  APP_NAME,
  MARKDOWN_EMBEDDABLE_TYPE,
  MARKDOWN_SAVED_OBJECT_TYPE,
} from '../common/constants';
import type { MarkdownEmbeddableState } from '../server';
import { ADD_MARKDOWN_ACTION_ID, CONVERT_LEGACY_MARKDOWN_ACTION_ID } from './constants';
import { setupLegacyVis } from './legacy_vis/setup';
import { setKibanaServices } from './services/kibana_services';

export interface MarkdownSetupDeps {
  contentManagement: ContentManagementPublicSetup;
  embeddable: EmbeddableSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

export interface MarkdownStartDeps {
  uiActions: UiActionsStart;
}

export class DashboardMarkdownPlugin
  implements Plugin<void, void, MarkdownSetupDeps, MarkdownStartDeps>
{
  public setup(
    core: CoreSetup<MarkdownStartDeps>,
    { contentManagement, embeddable, expressions, visualizations }: MarkdownSetupDeps
  ) {
    embeddable.registerEmbeddablePublicDefinition(MARKDOWN_EMBEDDABLE_TYPE, async () => {
      const { markdownEmbeddableFactory } = await import('./async_services');
      return markdownEmbeddableFactory;
    });

    embeddable.registerAddFromLibraryType({
      onAdd: async (container, savedObject) => {
        container.addNewPanel<MarkdownEmbeddableState>(
          {
            panelType: MARKDOWN_EMBEDDABLE_TYPE,
            serializedState: {
              ref_id: savedObject.id,
            },
          },
          {
            displaySuccessMessage: true,
          }
        );
      },
      savedObjectType: MARKDOWN_SAVED_OBJECT_TYPE,
      savedObjectName: APP_NAME,
      getIconForSavedObject: () => APP_ICON,
      getSavedObjects: async (searchRequest) => {
        const { markdownClient } = await import('./async_services');
        const result = await markdownClient.search({ ...searchRequest });
        return result.markdowns.map(({ id, data, meta }) => {
          return {
            type: MARKDOWN_SAVED_OBJECT_TYPE,
            id,
            attributes: data,
            ...meta,
            references: [],
          };
        });
      },
    });

    setupLegacyVis(core.getStartServices, expressions, visualizations);
  }

  public start(core: CoreStart, plugins: MarkdownStartDeps) {
    setKibanaServices(core, plugins);
    plugins.uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_MARKDOWN_ACTION_ID, async () => {
      const { createMarkdownAction } = await import('./async_services');
      return createMarkdownAction();
    });

    plugins.uiActions.addTriggerActionAsync(
      ON_OPEN_PANEL_MENU,
      CONVERT_LEGACY_MARKDOWN_ACTION_ID,
      async () => {
        const { getConvertLegacyMarkdownAction } = await import('./async_services');
        return getConvertLegacyMarkdownAction();
      }
    );
  }

  public stop() {}
}
