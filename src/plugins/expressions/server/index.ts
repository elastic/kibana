/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'src/core/server';
import { ExpressionsServerPlugin } from './plugin';

export type { ExpressionsServerSetup, ExpressionsServerStart } from './plugin';

// Kibana Platform.
export { ExpressionsServerPlugin as Plugin };
export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsServerPlugin(initializerContext);
}

// Static exports.
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
} from '../common';
export {
  buildExpression,
  buildExpressionFunction,
  Execution,
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
} from '../common';
