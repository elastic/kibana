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
import type { VisualizationClient } from '@kbn/visualizations-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import { i18n } from '@kbn/i18n';
import {
  APP_ICON,
  APP_NAME,
  MARKDOWN_EMBEDDABLE_TYPE,
  MARKDOWN_SAVED_OBJECT_TYPE,
} from '../common/constants';
import type { MarkdownEmbeddableState, StoredMarkdownState } from '../server';
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
    });

    setupLegacyVis(core.getStartServices, expressions, visualizations);

    visualizations.registerAlias({
      disableCreate: true,
      name: MARKDOWN_SAVED_OBJECT_TYPE,
      title: APP_NAME,
      icon: APP_ICON,
      description: i18n.translate('dashboardMarkdown.visualizationsAlias.description', {
        defaultMessage: 'Use Markdown to add formatted text and links to dashboards.',
      }),
      stage: 'production',
      appExtensions: {
        visualizations: {
          docTypes: [MARKDOWN_SAVED_OBJECT_TYPE],
          searchFields: ['title^3', 'description'],
          client: () =>
            ({
              get: async (id) => {
                const { getMarkdownClient } = await import('./markdown_client/markdown_client');
                return getMarkdownClient().get(id);
              },
              create: async (request) => {
                const { getMarkdownClient } = await import('./markdown_client/markdown_client');
                return getMarkdownClient().create(request);
              },
              update: async (request) => {
                const { getMarkdownClient } = await import('./markdown_client/markdown_client');
                return getMarkdownClient().update(request);
              },
              delete: async (id) => {
                const { getMarkdownClient } = await import('./markdown_client/markdown_client');
                return getMarkdownClient().delete(id);
              },
              search: async (request) => {
                const { getMarkdownClient } = await import('./markdown_client/markdown_client');
                return getMarkdownClient().search(request);
              },
            } as VisualizationClient<typeof MARKDOWN_SAVED_OBJECT_TYPE, StoredMarkdownState>),
          toListItem(
            markdownItem: Omit<SOWithMetadata<StoredMarkdownState>, 'attributes'> & {
              attributes: { title: string; description?: string };
            }
          ) {
            const { id, type, updatedAt, attributes } = markdownItem;
            return {
              id,
              title: attributes.title,
              description: attributes.description,
              updatedAt,
              icon: APP_ICON,
              typeTitle: APP_NAME,
              stage: 'production' as const,
              savedObjectType: type,
              editor: {
                onEdit: async (savedObjectId: string) => {
                  const { onVisualizationsEdit } = await import('./editor/on_visualizations_edit');
                  onVisualizationsEdit(savedObjectId);
                },
              },
            };
          },
        },
      },
    });
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
