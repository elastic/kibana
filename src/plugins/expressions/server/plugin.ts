/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pick } from 'lodash';
import type { CoreSetup, CoreStart } from '../../../core/server';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type {
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
} from '../common/service/expressions_services';
import { ExpressionsService } from '../common/service/expressions_services';

export type ExpressionsServerSetup = ExpressionsServiceSetup;

export type ExpressionsServerStart = ExpressionsServiceStart;

export class ExpressionsServerPlugin
  implements Plugin<ExpressionsServerSetup, ExpressionsServerStart> {
  readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ExpressionsServerSetup {
    this.expressions.executor.extendContext({
      environment: 'server',
    });

    const setup = this.expressions.setup(pick(core, 'getStartServices'));

    return Object.freeze(setup);
  }

  public start(core: CoreStart): ExpressionsServerStart {
    const start = this.expressions.start();

    return Object.freeze(start);
  }

  public stop() {
    this.expressions.stop();
  }
}
