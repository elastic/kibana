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
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { EventAnnotationService } from './event_annotation_service';
import {
  manualPointEventAnnotation,
  manualRangeEventAnnotation,
  queryPointEventAnnotation,
  eventAnnotationGroup,
} from '../common';
import { getFetchEventAnnotations } from './fetch_event_annotations';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';

export interface EventAnnotationStartDependencies {
  data: DataPublicPluginStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  contentManagement: ContentManagementPublicStart;
}

interface SetupDependencies {
  expressions: ExpressionsSetup;
  visualizations: VisualizationsSetup;
  contentManagement: ContentManagementPublicSetup;
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

    dependencies.contentManagement.registry.register({
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
      },
      name: i18n.translate('eventAnnotation.content.name', {
        defaultMessage: 'Annotation group',
      }),
    });
  }

  public start(
    core: CoreStart,
    startDependencies: EventAnnotationStartDependencies
  ): EventAnnotationService {
    return new EventAnnotationService(core, startDependencies.contentManagement);
  }
}
