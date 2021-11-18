/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109902
/* eslint-disable @kbn/eslint/no_export_all */

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
export type { ExpressionExecutor, IExpressionLoaderParams, ExpressionRenderError } from './types';
export type {
  ExpressionRendererComponent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from './react_expression_renderer';
export { ReactExpressionRenderer } from './react_expression_renderer';
export type { ExpressionRendererEvent } from './render';
export { ExpressionRenderHandler } from './render';
export type {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  ArgumentType,
  Datatable,
  DatatableColumn,
  DatatableColumnType,
  DatatableRow,
  ExecutionContainer,
  ExecutionContext,
  ExecutionParams,
  ExecutionState,
  ExecutorContainer,
  ExecutorState,
  ExpressionAstArgument,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
  ExpressionAstFunctionBuilder,
  ExpressionAstNode,
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
  ExpressionImage,
  ExpressionRenderDefinition,
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
  FontValue,
  IInterpreterRenderHandlers,
  InterpreterErrorType,
  IRegistry,
  KnownTypeToString,
  PointSeries,
  PointSeriesColumn,
  PointSeriesColumnName,
  PointSeriesColumns,
  PointSeriesRow,
  Range,
  SerializedDatatable,
  Style,
  TypeString,
  TypeToString,
  UnmappedTypeStrings,
  ExpressionValueRender as Render,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
} from '../common';
export {
  buildExpression,
  buildExpressionFunction,
  Execution,
  ExecutionContract,
  Executor,
  ExpressionFunction,
  ExpressionFunctionParameter,
  ExpressionRenderer,
  ExpressionRendererRegistry,
  ExpressionType,
  FontStyle,
  FontWeight,
  format,
  formatExpression,
  FunctionsRegistry,
  isExpressionAstBuilder,
  Overflow,
  parse,
  parseExpression,
  TextAlignment,
  TextDecoration,
  TypesRegistry,
  ExpressionsService,
  TablesAdapter,
  ExpressionsInspectorAdapter,
  createDefaultInspectorAdapters,
} from '../common';
