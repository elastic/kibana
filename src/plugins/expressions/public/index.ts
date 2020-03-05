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

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';
import { ExpressionsPublicPlugin } from './plugin';

// Kibana Platform.
export { ExpressionsPublicPlugin as Plugin };
export * from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsPublicPlugin(initializerContext);
}

// Static exports.
export { ExpressionExecutor, IExpressionLoaderParams } from './types';
export {
  ExpressionRendererComponent,
  ReactExpressionRenderer,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from './react_expression_renderer';
export { ExpressionRenderHandler } from './render';
export {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  ArgumentType,
  Datatable,
  DatatableColumn,
  DatatableColumnType,
  DatatableRow,
  Execution,
  ExecutionContract,
  ExecutionContainer,
  ExecutionContext,
  ExecutionParams,
  ExecutionState,
  Executor,
  ExecutorContainer,
  ExecutorState,
  ExpressionAstArgument,
  ExpressionAstExpression,
  ExpressionAstFunction,
  ExpressionAstNode,
  ExpressionFunction,
  ExpressionFunctionDefinition,
  ExpressionFunctionKibana,
  ExpressionFunctionParameter,
  ExpressionImage,
  ExpressionRenderDefinition,
  ExpressionRenderer,
  ExpressionRendererRegistry,
  ExpressionType,
  ExpressionTypeDefinition,
  ExpressionTypeStyle,
  ExpressionValue,
  ExpressionValueBoxed,
  ExpressionValueConverter,
  ExpressionValueError,
  ExpressionValueNum,
  ExpressionValueRender,
  ExpressionValueSearchContext,
  ExpressionValueUnboxed,
  Filter,
  Font,
  FontLabel,
  FontStyle,
  FontValue,
  FontWeight,
  format,
  formatExpression,
  FunctionsRegistry,
  IInterpreterRenderHandlers,
  InterpreterErrorType,
  IRegistry,
  KIBANA_CONTEXT_NAME,
  KibanaContext,
  KibanaDatatable,
  KibanaDatatableColumn,
  KibanaDatatableRow,
  KnownTypeToString,
  Overflow,
  parse,
  parseExpression,
  PointSeries,
  PointSeriesColumn,
  PointSeriesColumnName,
  PointSeriesColumns,
  PointSeriesRow,
  Range,
  SerializedDatatable,
  SerializedFieldFormat,
  Style,
  TextAlignment,
  TextDecoration,
  TypesRegistry,
  TypeString,
  TypeToString,
  UnmappedTypeStrings,
  ExpressionValueRender as Render,
} from '../common';
