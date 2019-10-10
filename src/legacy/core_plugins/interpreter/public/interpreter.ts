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

import 'uiExports/interpreter';
// @ts-ignore
import { register, registryFactory } from '@kbn/interpreter/common';
import {
  initializeExecutor,
  ExpressionExecutor,
  ExpressionInterpretWithHandlers,
} from './lib/interpreter';
import { registries } from './registries';
import { visualization } from './renderers/visualization';

import { clog as clogFn } from './functions/clog';
import { esaggs as esaggsFn } from './functions/esaggs';
import { font as fontFn } from './functions/font';
import { kibana as kibanaFn } from './functions/kibana';
import { range as rangeFn } from './functions/range';
import { visualization as visualizationFn } from './functions/visualization';
import { visDimension as visDimensionFn } from './functions/vis_dimension';

/* eslint-disable */
import { boolean } from '../../../../plugins/expressions/public/expression_types/boolean';
import { datatable } from '../../../../plugins/expressions/public/expression_types/datatable';
import { error } from '../../../../plugins/expressions/public/expression_types/error';
import { filter } from '../../../../plugins/expressions/public/expression_types/filter';
import { image } from '../../../../plugins/expressions/public/expression_types/image';
import { nullType } from '../../../../plugins/expressions/public/expression_types/null';
import { number } from '../../../../plugins/expressions/public/expression_types/number';
import { pointseries } from '../../../../plugins/expressions/public/expression_types/pointseries';
import { range } from '../../../../plugins/expressions/public/expression_types/range';
import { render } from '../../../../plugins/expressions/public/expression_types/render';
import { shape } from '../../../../plugins/expressions/public/expression_types/shape';
import { string } from '../../../../plugins/expressions/public/expression_types/string';
import { style } from '../../../../plugins/expressions/public/expression_types/style';
import { kibanaContext } from '../../../../plugins/expressions/public/expression_types/kibana_context';
import { kibanaDatatable } from '../../../../plugins/expressions/public/expression_types/kibana_datatable';
/* eslint-enable */

// Expose kbnInterpreter.register(specs) and kbnInterpreter.registries() globally so that plugins
// can register without a transpile step.
(global as any).kbnInterpreter = Object.assign(
  (global as any).kbnInterpreter || {},
  registryFactory(registries)
);

// These will be moved to Expression plugin.
registries.browserFunctions.register(clogFn);
registries.browserFunctions.register(fontFn);
registries.browserFunctions.register(kibanaFn);
registries.types.register(boolean);
registries.types.register(datatable);
registries.types.register(error);
registries.types.register(filter);
registries.types.register(image);
registries.types.register(nullType);
registries.types.register(number);
registries.types.register(pointseries);
registries.types.register(range);
registries.types.register(render);
registries.types.register(shape);
registries.types.register(string);
registries.types.register(style);
registries.types.register(kibanaContext);
registries.types.register(kibanaDatatable);

// This will be moved to Search service.
registries.browserFunctions.register(esaggsFn);

// These will be moved to Visualizations plugin.
registries.browserFunctions.register(rangeFn);
registries.browserFunctions.register(visDimensionFn);
registries.browserFunctions.register(visualizationFn);
registries.renderers.register(visualization);

let executorPromise: Promise<ExpressionExecutor> | undefined;

export const getInterpreter = async () => {
  if (!executorPromise) {
    executorPromise = initializeExecutor();
  }
  return await executorPromise;
};

export const interpretAst: ExpressionInterpretWithHandlers = async (ast, context, handlers) => {
  const { interpreter } = await getInterpreter();
  return await interpreter.interpretAst(ast, context, handlers);
};
