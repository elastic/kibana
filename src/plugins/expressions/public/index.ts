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

import { PluginInitializerContext } from '../../../core/public';
import { ExpressionsPublicPlugin } from './plugin';

export { ExpressionsPublicPlugin as Plugin };

export * from './plugin';
export * from './types';
export * from '../common';
export { interpreterProvider, ExpressionInterpret } from './interpreter_provider';
export { ExpressionRenderer, ExpressionRendererProps } from './expression_renderer';
export { ExpressionDataHandler } from './execute';

export { ExpressionRenderHandler } from './render';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsPublicPlugin(initializerContext);
}
