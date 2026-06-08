/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { PresentationUtilPluginSetup } from '@kbn/presentation-util-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsPublicSetup } from '@kbn/ui-actions-plugin/public/plugin';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

import type { LinksEmbeddableState } from '../common';
import { APP_ICON, APP_NAME, LINKS_EMBEDDABLE_TYPE, LINKS_LIBRARY_TYPE } from '../common';
import type { LinksState } from '../server';
import { ADD_LINKS_PANEL_ACTION_ID } from './actions/constants';
import { setKibanaServices } from './services/kibana_services';

export interface LinksSetupDependencies {
  embeddable: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  contentManagement: ContentManagementPublicSetup;
  presentationUtil: PresentationUtilPluginSetup;
  uiActions: UiActionsPublicSetup;
}

export interface LinksStartDependencies {
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
  contentManagement: ContentManagementPublicStart;
  usageCollection?: UsageCollectionStart;
}

export class LinksPlugin
  implements Plugin<void, void, LinksSetupDependencies, LinksStartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<LinksStartDependencies>, plugins: LinksSetupDependencies) {
    plugins.embeddable.registerAddFromLibraryType({
      onAdd: async (container, savedObject) => {
        container.addNewPanel<LinksEmbeddableState>(
          {
            panelType: LINKS_EMBEDDABLE_TYPE,
            serializedState: {
              ref_id: savedObject.id,
            },
          },
          {
            displaySuccessMessage: true,
          }
        );
      },
      savedObjectType: LINKS_LIBRARY_TYPE,
      savedObjectName: APP_NAME,
      getIconForSavedObject: () => APP_ICON,
    });

    plugins.embeddable.registerEmbeddablePublicDefinition(LINKS_EMBEDDABLE_TYPE, async () => {
      const { getLinksEmbeddableFactory } = await import('./embeddable/links_embeddable');
      return getLinksEmbeddableFactory();
    });

    plugins.embeddable.registerLegacyURLTransform(LINKS_EMBEDDABLE_TYPE, async () => {
      const { transformOut } = await import('../common/embeddable/transforms/transform_out');
      return transformOut;
    });

    import('./links_client/links_client').then(({ getLinksClient }) =>
      plugins.visualizations.registerAlias({
        disableCreate: true, // do not allow creation through visualization listing page
        name: LINKS_LIBRARY_TYPE,
        title: APP_NAME,
        icon: APP_ICON,
        description: i18n.translate('links.description', {
          defaultMessage: 'Use links to navigate to commonly used dashboards and websites.',
        }),
        stage: 'production',
        appExtensions: {
          visualizations: {
            docTypes: [LINKS_LIBRARY_TYPE],
            searchFields: ['title^3'],
            client: getLinksClient,
            toListItem(
              linkItem: Omit<SOWithMetadata<LinksState>, 'attributes'> & {
                attributes: { title: string; description?: string };
              }
            ) {
              const { id, type, updatedAt, attributes } = linkItem;
              const { title, description } = attributes;

              return {
                id,
                title,
                editor: {
                  onEdit: async (refId: string) => {
                    const { onVisualizationsEdit } = await import(
                      './editor/on_visualizations_edit'
                    );
                    onVisualizationsEdit(refId);
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
      })
    );

    plugins.uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ADD_LINKS_PANEL_ACTION_ID,
      async () => {
        const { addLinksPanelAction } = await import('./actions/add_links_panel_action');
        return addLinksPanelAction;
      }
    );
  }

  public start(core: CoreStart, plugins: LinksStartDependencies) {
    setKibanaServices(core, plugins);

    return {};
  }

  public stop() {}
}
