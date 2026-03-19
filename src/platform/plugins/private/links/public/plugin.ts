/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { LinksEmbeddableState } from '../common';
import {
  APP_ICON,
  APP_NAME,
  CONTENT_ID,
  LATEST_VERSION,
  LINKS_EMBEDDABLE_TYPE,
  LINKS_SAVED_OBJECT_TYPE,
} from '../common';
import type { LinksCrudTypes } from '../common/content_management';
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
          container.addNewPanel<LinksEmbeddableState>(
            {
              panelType: LINKS_EMBEDDABLE_TYPE,
              serializedState: {
                savedObjectId: savedObject.id,
              },
            },
            {
              displaySuccessMessage: true,
            }
          );
        },
        savedObjectType: LINKS_SAVED_OBJECT_TYPE,
        savedObjectName: APP_NAME,
        getIconForSavedObject: () => APP_ICON,
      });

      plugins.embeddable.registerReactEmbeddableFactory(LINKS_EMBEDDABLE_TYPE, async () => {
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
            toListItem(
              linkItem: Omit<LinksCrudTypes['Item'], 'attributes'> & {
                attributes: { title: string; description?: string };
              }
            ) {
              const { id, type, updatedAt, attributes } = linkItem;
              const { title, description } = attributes;

              return {
                id,
                title,
                editor: {
                  onEdit: async (savedObjectId: string) => {
                    const { onVisualizationsEdit } = await import(
                      './editor/on_visualizations_edit'
                    );
                    onVisualizationsEdit(savedObjectId);
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

    plugins.presentationUtil.registerPanelPlacementSettings(
      LINKS_EMBEDDABLE_TYPE,
      async (serializedState?: LinksEmbeddableState) => {
        const { getPanelPlacement } = await import('./embeddable/embeddable_module');
        const placementSettings = await getPanelPlacement(serializedState);
        return { placementSettings };
      }
    );

    return {};
  }

  public stop() {}
}
