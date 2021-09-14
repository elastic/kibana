/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109902
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from 'src/core/server';
import { ExpressionsServerPlugin } from './plugin';

export { ExpressionsServerSetup, ExpressionsServerStart } from './plugin';

// Kibana Platform.
export { ExpressionsServerPlugin as Plugin };
export * from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsServerPlugin(initializerContext);
}

// Static exports.
export {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  ArgumentType,
  buildExpression,
  buildExpressionFunction,
  Datatable,
  DatatableColumn,
  DatatableColumnType,
  DatatableRow,
  Execution,
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
  format,
  formatExpression,
  FunctionsRegistry,
  IInterpreterRenderHandlers,
  InterpreterErrorType,
  IRegistry,
  isExpressionAstBuilder,
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
