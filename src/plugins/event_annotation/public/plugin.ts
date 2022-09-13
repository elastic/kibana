/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EventAnnotationService } from './event_annotation_service';
import {
  manualPointEventAnnotation,
  manualRangeEventAnnotation,
  queryPointEventAnnotation,
  eventAnnotationGroup,
} from '../common';
import { getFetchEventAnnotations } from './fetch_event_annotations';

export interface EventAnnotationStartDependencies {
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
}

interface SetupDependencies {
  expressions: ExpressionsSetup;
}

/** @public */
export type EventAnnotationPluginStart = EventAnnotationService;
export type EventAnnotationPluginSetup = EventAnnotationService;

/** @public */
export class EventAnnotationPlugin
  implements Plugin<EventAnnotationPluginSetup, EventAnnotationService>
{
  private readonly eventAnnotationService = new EventAnnotationService();

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
    return this.eventAnnotationService;
  }

  public start(
    core: CoreStart,
    startDependencies: EventAnnotationStartDependencies
  ): EventAnnotationService {
    return this.eventAnnotationService;
  }
}
