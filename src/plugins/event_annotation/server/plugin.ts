/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import {
  manualPointEventAnnotation,
  eventAnnotationGroup,
  manualRangeEventAnnotation,
  queryPointEventAnnotation,
} from '../common';
// import { getFetchEventAnnotations } from './fetch_event_annotations';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
}
export interface EventAnnotationStartDependencies {
  data: DataPluginStart;
}

export class EventAnnotationServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup<EventAnnotationStartDependencies, object>,
    dependencies: SetupDependencies
  ) {
    dependencies.expressions.registerFunction(manualPointEventAnnotation);
    dependencies.expressions.registerFunction(manualRangeEventAnnotation);
    dependencies.expressions.registerFunction(queryPointEventAnnotation);
    dependencies.expressions.registerFunction(eventAnnotationGroup);
    // dependencies.expressions.registerFunction(
    //   getFetchEventAnnotations({ getStartServices: core.getStartServices })
    // );

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
