/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { manualEventAnnotation } from '../common';
import { ExpressionsServerSetup } from '../../expressions/server';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
}

export class EventAnnotationServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup, dependencies: SetupDependencies) {
    dependencies.expressions.registerFunction(manualEventAnnotation);

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
