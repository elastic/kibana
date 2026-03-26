/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { DashboardSetup } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import type { EventAnnotationPluginStart } from '@kbn/event-annotation-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { EventAnnotationListingPageServices } from './get_table_list';

export interface EventAnnotationListingStartDependencies {
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  eventAnnotation: EventAnnotationPluginStart;
  data: DataPublicPluginStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  dataViews: DataViewsPublicPluginStart;
  embeddable: EmbeddableStart;
  kql: KqlPluginStart;
  contentManagement: ContentManagementPublicStart;
  lens: LensPublicStart;
}

interface SetupDependencies {
  visualizations: VisualizationsSetup;
  dashboard: DashboardSetup;
}

/** @public */
export type EventAnnotationListingPluginStart = void;
export type EventAnnotationListingPluginSetup = void;

/** @public */
export class EventAnnotationListingPlugin
  implements
    Plugin<
      EventAnnotationListingPluginSetup,
      EventAnnotationListingPluginStart,
      SetupDependencies,
      EventAnnotationListingStartDependencies
    >
{
  public setup(
    core: CoreSetup<EventAnnotationListingStartDependencies>,
    dependencies: SetupDependencies
  ) {
    const annotationGroupsTabConfig = {
      title: i18n.translate('eventAnnotationListing.listingViewTitle', {
        defaultMessage: 'Annotation groups',
      }),
      id: 'annotations',
      getTableList: async (props: TableListTabParentProps) => {
        const [coreStart, pluginsStart] = await core.getStartServices();

        const eventAnnotationService = await pluginsStart.eventAnnotation.getService();

        const ids = await pluginsStart.dataViews.getIds();
        const dataViews = await Promise.all(ids.map((id) => pluginsStart.dataViews.get(id)));

        const services: EventAnnotationListingPageServices = {
          core: coreStart,
          LensEmbeddableComponent: pluginsStart.lens.EmbeddableComponent,
          embeddable: pluginsStart.embeddable,
          savedObjectsTagging: pluginsStart.savedObjectsTagging,
          eventAnnotationService,
          dataViews,
          createDataView: pluginsStart.dataViews.create.bind(pluginsStart.dataViews),
          sessionService: pluginsStart.data.search.session,
          queryInputServices: {
            http: coreStart.http,
            docLinks: coreStart.docLinks,
            notifications: coreStart.notifications,
            uiSettings: coreStart.uiSettings,
            dataViews: pluginsStart.dataViews,
            kql: pluginsStart.kql,
            data: pluginsStart.data,
            storage: new Storage(localStorage),
          },
        };

        const { getTableList } = await import('./get_table_list');
        return getTableList(props, services);
      },
    };
    dependencies.visualizations.listingViewRegistry.add(annotationGroupsTabConfig);
    dependencies.dashboard.registerListingPageTab(annotationGroupsTabConfig);
  }

  public start(core: CoreStart, plugins: object): void {
    // nothing to do here
  }
}
