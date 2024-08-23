/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import { LinksRuntimeState } from './types';
import { APP_ICON, APP_NAME, CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksCrudTypes } from '../common/content_management';
import { LinksStrings } from './components/links_strings';
import { getLinksClient } from './content_management/links_content_management_client';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import { registerCreateLinksPanelAction } from './actions/create_links_panel_action';
import { deserializeLinksSavedObject } from './lib/deserialize_from_library';
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

      plugins.embeddable.registerReactEmbeddableSavedObject({
        onAdd: async (container, savedObject) => {
          const initialState = await deserializeLinksSavedObject(savedObject);
          container.addNewPanel<LinksRuntimeState>({
            panelType: CONTENT_ID,
            initialState,
          });
        },
        embeddableType: CONTENT_ID,
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
        description: LinksStrings.getDescription(),
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
                    const { openEditorFlyout } = await import('./editor/open_editor_flyout');
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
    untilPluginStartServicesReady().then(() => {
      registerCreateLinksPanelAction();

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
    });

    return {};
  }

  public stop() {}
}
