/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { palette, systemPalette } from '../common';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
}

export class ChartsServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup, dependencies: SetupDependencies) {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
