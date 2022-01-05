/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CoreSetup, CoreStart, Plugin } from '../../../../core/server';
import { pieLabelsFunction, pieVisFunction } from '../common';
import {
  ExpressionPartitionVisPluginSetup,
  ExpressionPartitionVisPluginStart,
  SetupDeps,
  StartDeps,
} from './types';

export class ExpressionPartitionVisPlugin
  implements
    Plugin<
      ExpressionPartitionVisPluginSetup,
      ExpressionPartitionVisPluginStart,
      SetupDeps,
      StartDeps
    >
{
  public setup(core: CoreSetup, { expressions }: SetupDeps) {
    expressions.registerFunction(pieLabelsFunction);
    expressions.registerFunction(pieVisFunction);
  }

  public start(core: CoreStart, deps: StartDeps) {}

  public stop() {}
}
