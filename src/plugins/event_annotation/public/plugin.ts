/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Plugin, type CoreSetup, type CoreStart } from '@kbn/core/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public/types';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { EventAnnotationService } from './event_annotation_service';
import {
  manualPointEventAnnotation,
  manualRangeEventAnnotation,
  queryPointEventAnnotation,
  eventAnnotationGroup,
} from '../common';
import { getFetchEventAnnotations } from './fetch_event_annotations';
import { EventAnnotationListingPageServices, getTableList } from './get_table_list';

export interface EventAnnotationStartDependencies {
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  data: DataPublicPluginStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

interface SetupDependencies {
  expressions: ExpressionsSetup;
  visualizations: VisualizationsSetup;
}

/** @public */
export type EventAnnotationPluginStart = EventAnnotationService;
export type EventAnnotationPluginSetup = void;

/** @public */
export class EventAnnotationPlugin
  implements Plugin<EventAnnotationPluginSetup, EventAnnotationService>
{
  public setup(
    core: CoreSetup<EventAnnotationStartDependencies, EventAnnotationService>,
    dependencies: SetupDependencies
  ) {
    dependencies.expressions.registerFunction(manualPointEventAnnotation);
    dependencies.expressions.registerFunction(manualRangeEventAnnotation);
    dependencies.expressions.registerFunction(queryPointEventAnnotation);
    dependencies.expressions.registerFunction(eventAnnotationGroup);
    dependencies.expressions.registerFunction(
      getFetchEventAnnotations({ getStartServices: core.getStartServices })
    );

    dependencies.visualizations.listingViewRegistry.add({
      title: 'Annotation Groups',
      id: 'annotations',
      getTableList: async (props) => {
        const [coreStart, pluginsStart] = await core.getStartServices();

        const eventAnnotationService = await new EventAnnotationService(
          coreStart,
          pluginsStart.savedObjectsManagement
        ).getService();

        const dataViewListItems = await pluginsStart.dataViews.getIdsWithTitle();

        const services: EventAnnotationListingPageServices = {
          core: coreStart,
          savedObjectsTagging: pluginsStart.savedObjectsTagging,
          eventAnnotationService,
          PresentationUtilContextProvider: pluginsStart.presentationUtil.ContextProvider,
          dataViewListItems,
        };

        // TODO wire parent props
        return getTableList(props, services);
      },
    });
  }

  public start(
    core: CoreStart,
    startDependencies: EventAnnotationStartDependencies
  ): EventAnnotationService {
    return new EventAnnotationService(core, startDependencies.savedObjectsManagement);
  }
}
