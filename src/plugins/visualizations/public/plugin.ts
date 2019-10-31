/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionsSetup, ExpressionsStart } from '../../expressions/public';
import { range as rangeExpressionFunction } from './expression_functions/range';
import { visDimension as visDimensionExpressionFunction } from './expression_functions/vis_dimension';

export interface VisualizationsSetupDeps {
  expressions: ExpressionsSetup;
}

export interface VisualizationsStartDeps {
  expressions: ExpressionsStart;
}

export type VisualizationsSetup = void;

export type VisualizationsStart = void;

export class VisualizationsPublicPlugin
  implements
    Plugin<
      VisualizationsSetup,
      VisualizationsStart,
      VisualizationsSetupDeps,
      VisualizationsStartDeps
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { expressions }: VisualizationsSetupDeps): VisualizationsSetup {
    expressions.registerFunction(rangeExpressionFunction);
    expressions.registerFunction(visDimensionExpressionFunction);

    return undefined;
  }

  public start(core: CoreStart, { expressions }: VisualizationsStartDeps): VisualizationsStart {
    return undefined;
  }

  public stop() {}
}
