/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Adapters } from '../../../inspector/public';
import {
  IInterpreterRenderHandlers,
  ExpressionValue,
  ExpressionsService,
  SerializableState,
  RenderMode,
} from '../../common';
import { ExpressionRenderHandlerParams } from '../render';

/**
 * @deprecated
 *
 * This type if remainder from legacy platform, will be deleted going further.
 */
export interface ExpressionExecutor {
  interpreter: ExpressionInterpreter;
}

/**
 * @deprecated
 */
export interface ExpressionInterpreter {
  interpretAst: ExpressionsService['run'];
}

export interface IExpressionLoaderParams {
  searchContext?: SerializableState;
  context?: ExpressionValue;
  variables?: Record<string, any>;
  // Enables debug tracking on each expression in the AST
  debug?: boolean;
  disableCaching?: boolean;
  customFunctions?: [];
  customRenderers?: [];
  uiState?: unknown;
  inspectorAdapters?: Adapters;
  onRenderError?: RenderErrorHandlerFnType;
  searchSessionId?: string;
  renderMode?: RenderMode;
  syncColors?: boolean;
  hasCompatibleActions?: ExpressionRenderHandlerParams['hasCompatibleActions'];
}

export interface ExpressionRenderError extends Error {
  type?: string;
  original?: Error;
}

export type RenderErrorHandlerFnType = (
  domNode: HTMLElement,
  error: ExpressionRenderError,
  handlers: IInterpreterRenderHandlers
) => void;
