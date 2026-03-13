/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { DashboardSetup, DashboardListingTab } from '@kbn/dashboard-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import { i18n } from '@kbn/i18n';
import type { VisualizationListingPageServices } from './get_table_list';

export interface VisualizationListingStartDependencies {
  visualizations: VisualizationsStart;
  contentManagement: ContentManagementPublicStart;
  embeddable: EmbeddableStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

interface SetupDependencies {
  dashboard?: DashboardSetup;
}

/** @public */
export type VisualizationListingPluginStart = void;
export type VisualizationListingPluginSetup = void;

/** @public */
export class VisualizationListingPlugin
  implements
    Plugin<
      VisualizationListingPluginSetup,
      VisualizationListingPluginStart,
      SetupDependencies,
      VisualizationListingStartDependencies
    >
{
  public setup(
    core: CoreSetup<VisualizationListingStartDependencies>,
    dependencies: SetupDependencies
  ) {
    const visualizationsTabConfig: DashboardListingTab = {
      title: i18n.translate('visualizationListing.listingViewTitle', {
        defaultMessage: 'Visualizations',
      }),
      id: 'visualizations',
      getTableList: async (props: TableListTabParentProps) => {
        const [coreStart, pluginsStart] = await core.getStartServices();

        const services: VisualizationListingPageServices = {
          core: coreStart,
          visualizations: pluginsStart.visualizations,
          contentManagement: pluginsStart.contentManagement,
          embeddable: pluginsStart.embeddable,
          savedObjectsTagging: pluginsStart.savedObjectsTaggingOss?.getTaggingApi,
        };

        const { getTableList } = await import('./get_table_list');
        return getTableList(props, services);
      },
      deepLink: {
        title: i18n.translate('visualizationListing.deepLinkTitle', {
          defaultMessage: 'Visualize library',
        }),
        visibleIn: ['globalSearch'],
      },
    };

    if (dependencies.dashboard) {
      dependencies.dashboard.registerListingPageTab(visualizationsTabConfig);
    }
  }

  public start(_core: CoreStart, _plugins: VisualizationListingStartDependencies): void {
    // nothing to do here
  }
}
