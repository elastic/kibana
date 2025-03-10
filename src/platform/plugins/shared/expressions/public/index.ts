/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './index.scss';

import { PluginInitializerContext } from '@kbn/core/public';
import { ExpressionsPublicPlugin } from './plugin';

// Kibana Platform.
export { ExpressionsPublicPlugin as Plugin };
export type { ExpressionsSetup, ExpressionsStart } from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsPublicPlugin(initializerContext);
}

// Static exports.
export type {
  ExpressionExecutor,
  IExpressionLoaderParams,
  ExpressionRenderError,
  ExpressionRendererEvent,
} from './types';
export type { ExpressionLoader } from './loader';
export type { ExpressionRenderHandler } from './render';
export type {
  ExpressionRendererComponent,
  ExpressionRendererParams,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from './react_expression_renderer';
export { useExpressionRenderer } from './react_expression_renderer';
export type {
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
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
  ExpressionAstFunctionBuilder,
  ExpressionAstNode,
  ExpressionFunction,
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
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
  ExpressionValueUnboxed,
  ExpressionValueFilter,
  Font,
  FontLabel,
  FontStyle,
  FontValue,
  FontWeight,
  FunctionsRegistry,
  IInterpreterRenderHandlers,
  InterpreterErrorType,
  IRegistry,
  KnownTypeToString,
  Overflow,
  PointSeries,
  PointSeriesColumn,
  PointSeriesColumnName,
  PointSeriesColumns,
  PointSeriesRow,
  Range,
  SerializedDatatable,
  Style,
  TextAlignment,
  TextDecoration,
  TypesRegistry,
  TypeString,
  TypeToString,
  UnmappedTypeStrings,
  ExpressionValueRender as Render,
  ExpressionsService,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
  TablesAdapter,
} from '../common';

export {
  buildExpression,
  buildExpressionFunction,
  formatExpression,
  isExpressionAstBuilder,
  parseExpression,
  createDefaultInspectorAdapters,
} from '../common';

export { isSourceParamsESQL } from '../common/expression_types';
