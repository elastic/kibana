/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import {
  manualPointEventAnnotation,
  eventAnnotationGroup,
  manualRangeEventAnnotation,
  queryPointEventAnnotation,
} from '../common';
import { setupSavedObjects } from './saved_objects';
import { EventAnnotationGroupStorage } from './content_management';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
  contentManagement: ContentManagementServerSetup;
}
export interface EventAnnotationStartDependencies {
  data: DataPluginStart;
}

export class EventAnnotationServerPlugin implements Plugin<object, object> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<EventAnnotationStartDependencies, object>,
    dependencies: SetupDependencies
  ) {
    dependencies.expressions.registerFunction(manualPointEventAnnotation);
    dependencies.expressions.registerFunction(manualRangeEventAnnotation);
    dependencies.expressions.registerFunction(queryPointEventAnnotation);
    dependencies.expressions.registerFunction(eventAnnotationGroup);

    setupSavedObjects(core);

    dependencies.contentManagement.register({
      id: CONTENT_ID,
      storage: new EventAnnotationGroupStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.initializerContext.logger.get(),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
