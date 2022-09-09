/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import { createStartServicesGetter, StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import {
  partitionLabelsFunction,
  pieVisFunction,
  treemapVisFunction,
  mosaicVisFunction,
  waffleVisFunction,
} from '../common';
import { getPartitionVisRenderer } from './expression_renderers';
import {
  ExpressionPartitionVisPluginSetup,
  ExpressionPartitionVisPluginStart,
  SetupDeps,
  StartDeps,
} from './types';

/** @internal */
export interface VisTypePieDependencies {
  getStartDeps: StartServicesGetter<StartDeps>;
}

export class ExpressionPartitionVisPlugin {
  public setup(
    core: CoreSetup<StartDeps, void>,
    { expressions, charts }: SetupDeps
  ): ExpressionPartitionVisPluginSetup {
    expressions.registerFunction(partitionLabelsFunction);
    expressions.registerFunction(pieVisFunction);
    expressions.registerFunction(treemapVisFunction);
    expressions.registerFunction(mosaicVisFunction);
    expressions.registerFunction(waffleVisFunction);

    const getStartDeps = createStartServicesGetter<StartDeps, void>(core.getStartServices);

    expressions.registerRenderer(getPartitionVisRenderer({ getStartDeps }));
  }

  public start(core: CoreStart, deps: StartDeps): ExpressionPartitionVisPluginStart {}

  public stop() {}
}
