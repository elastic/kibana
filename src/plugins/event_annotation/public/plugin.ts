/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import {
  manualPointEventAnnotation,
  manualRangeEventAnnotation,
  eventAnnotationGroup,
  fetchEventAnnotations,
} from '../common';
import { EventAnnotationService } from './event_annotation_service';

interface SetupDependencies {
  expressions: ExpressionsSetup;
}

/** @public */
export type EventAnnotationPluginSetup = EventAnnotationService;

/** @public */
export type EventAnnotationPluginStart = EventAnnotationService;

/** @public */
export class EventAnnotationPlugin
  implements Plugin<EventAnnotationPluginSetup, EventAnnotationPluginStart>
{
  private readonly eventAnnotationService = new EventAnnotationService();

  public setup(core: CoreSetup, dependencies: SetupDependencies): EventAnnotationPluginSetup {
    dependencies.expressions.registerFunction(manualPointEventAnnotation);
    dependencies.expressions.registerFunction(manualRangeEventAnnotation);
    dependencies.expressions.registerFunction(eventAnnotationGroup);
    dependencies.expressions.registerFunction(fetchEventAnnotations);
    return this.eventAnnotationService;
  }

  public start(): EventAnnotationPluginStart {
    return this.eventAnnotationService;
  }
}
