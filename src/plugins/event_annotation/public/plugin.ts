/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../expressions/public';
import { annotationConfig, annotationKeyConfig } from '../common';
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
  private readonly annotationService = new EventAnnotationService();

  public setup(core: CoreSetup, dependencies: SetupDependencies): EventAnnotationPluginSetup {
    dependencies.expressions.registerFunction(annotationConfig);
    dependencies.expressions.registerFunction(annotationKeyConfig);
    return this.annotationService;
  }

  public start(): EventAnnotationPluginStart {
    return this.annotationService!;
  }
}
