/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  DashboardStart,
  DASHBOARD_GRID_COLUMN_COUNT,
  PanelPlacementStrategy,
} from '@kbn/dashboard-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { LinksRuntimeState } from './types';
import { APP_ICON, APP_NAME, CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksCrudTypes } from '../common/content_management';
import { getLinksClient } from './content_management/links_content_management_client';
import { setKibanaServices } from './services/kibana_services';
import { ADD_LINKS_PANEL_ACTION_ID } from './actions/constants';

export interface LinksSetupDependencies {
  embeddable: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface LinksStartDependencies {
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
  presentationUtil: PresentationUtilPluginStart;
  contentManagement: ContentManagementPublicStart;
  uiActions: UiActionsPublicStart;
  usageCollection?: UsageCollectionStart;
}

export class LinksPlugin
  implements Plugin<void, void, LinksSetupDependencies, LinksStartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<LinksStartDependencies>, plugins: LinksSetupDependencies) {
    core.getStartServices().then(([_, deps]) => {
      plugins.contentManagement.registry.register({
        id: CONTENT_ID,
        version: {
          latest: LATEST_VERSION,
        },
        name: APP_NAME,
      });

      plugins.embeddable.registerAddFromLibraryType({
        onAdd: async (container, savedObject) => {
          const { deserializeLinksSavedObject } = await import('./lib/deserialize_from_library');
          const initialState = await deserializeLinksSavedObject(savedObject);
          container.addNewPanel<LinksRuntimeState>({
            panelType: CONTENT_ID,
            initialState,
          });
        },
        savedObjectType: CONTENT_ID,
        savedObjectName: APP_NAME,
        getIconForSavedObject: () => APP_ICON,
      });

      plugins.embeddable.registerReactEmbeddableFactory(CONTENT_ID, async () => {
        const { getLinksEmbeddableFactory } = await import('./embeddable/links_embeddable');
        return getLinksEmbeddableFactory();
      });

      plugins.visualizations.registerAlias({
        disableCreate: true, // do not allow creation through visualization listing page
        name: CONTENT_ID,
        title: APP_NAME,
        icon: APP_ICON,
        description: i18n.translate('links.description', {
          defaultMessage: 'Use links to navigate to commonly used dashboards and websites.',
        }),
        stage: 'production',
        appExtensions: {
          visualizations: {
            docTypes: [CONTENT_ID],
            searchFields: ['title^3'],
            client: getLinksClient,
            toListItem(linkItem: LinksCrudTypes['Item']) {
              const { id, type, updatedAt, attributes } = linkItem;
              const { title, description } = attributes;

              return {
                id,
                title,
                editor: {
                  onEdit: async (savedObjectId: string) => {
                    const [{ openEditorFlyout }, { deserializeLinksSavedObject }] =
                      await Promise.all([
                        import('./editor/open_editor_flyout'),
                        import('./lib/deserialize_from_library'),
                      ]);
                    const linksSavedObject = await getLinksClient().get(savedObjectId);
                    const initialState = await deserializeLinksSavedObject(linksSavedObject.item);
                    await openEditorFlyout({ initialState });
                  },
                },
                description,
                updatedAt,
                icon: APP_ICON,
                typeTitle: APP_NAME,
                stage: 'production',
                savedObjectType: type,
              };
            },
          },
        },
      });
    });
  }

  public start(core: CoreStart, plugins: LinksStartDependencies) {
    setKibanaServices(core, plugins);

    plugins.uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ADD_LINKS_PANEL_ACTION_ID,
      async () => {
        const { addLinksPanelAction } = await import('./actions/add_links_panel_action');
        return addLinksPanelAction;
      }
    );

    plugins.dashboard.registerDashboardPanelPlacementSetting(
      CONTENT_ID,
      async (runtimeState?: LinksRuntimeState) => {
        if (!runtimeState) return {};
        const isHorizontal = runtimeState.layout === 'horizontal';
        const width = isHorizontal ? DASHBOARD_GRID_COLUMN_COUNT : 8;
        const height = isHorizontal ? 4 : (runtimeState.links?.length ?? 1 * 3) + 4;
        return { width, height, strategy: PanelPlacementStrategy.placeAtTop };
      }
    );

    return {};
  }

  public stop() {}
}
