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
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

import { APP_ICON, APP_NAME, CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksCrudTypes } from '../common/content_management';
import { LinksStrings } from './components/links_strings';
import { getLinksClient } from './content_management/links_content_management_client';
import { LinksFactoryDefinition } from './embeddable';
import { LinksByReferenceInput } from './embeddable/types';
import { setKibanaServices } from './services/kibana_services';

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
  usageCollection?: UsageCollectionStart;
}

export class LinksPlugin
  implements Plugin<void, void, LinksSetupDependencies, LinksStartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<LinksStartDependencies>, plugins: LinksSetupDependencies) {
    core.getStartServices().then(([_, deps]) => {
      const linksFactory = new LinksFactoryDefinition();

      plugins.embeddable.registerEmbeddableFactory(CONTENT_ID, linksFactory);

      plugins.contentManagement.registry.register({
        id: CONTENT_ID,
        version: {
          latest: LATEST_VERSION,
        },
        name: APP_NAME,
      });

      const getExplicitInput = async ({
        savedObjectId,
        parent,
      }: {
        savedObjectId?: string;
        parent?: DashboardContainer;
      }) => {
        try {
          await linksFactory.getExplicitInput({ savedObjectId } as LinksByReferenceInput, parent);
        } catch {
          // swallow any errors - this just means that the user cancelled editing
        }
        return;
      };

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
                editor: { onEdit: (savedObjectId: string) => getExplicitInput({ savedObjectId }) },
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
    return {};
  }

  public stop() {}
}
