/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { IExpressionLoaderParams } from './types';
import type { ExpressionAstExpression } from '../common';
import type { ExecutionContract } from '../common/execution/execution_contract';
import type { ExpressionRenderHandler } from './render';
export declare class ExpressionLoader {
  data$: ReturnType<ExecutionContract['getData']>;
  update$: ExpressionRenderHandler['update$'];
  render$: ExpressionRenderHandler['render$'];
  events$: ExpressionRenderHandler['events$'];
  loading$: Observable<void>;
  private execution;
  private renderHandler;
  private dataSubject;
  private loadingSubject;
  private data;
  private params;
  private subscription?;
  constructor(
    element: HTMLElement,
    expression?: string | ExpressionAstExpression,
    params?: IExpressionLoaderParams
  );
  destroy(): void;
  cancel(reason?: AbortReason): void;
  getExpression(): string | undefined;
  getAst(): ExpressionAstExpression | undefined;
  getElement(): HTMLElement;
  inspect(): Adapters | undefined;
  update(expression?: string | ExpressionAstExpression, params?: IExpressionLoaderParams): void;
  private loadData;
  private render;
  private setParams;
}
export type IExpressionLoader = (
  element: HTMLElement,
  expression?: string | ExpressionAstExpression,
  params?: IExpressionLoaderParams
) => Promise<ExpressionLoader>;
export declare const loader: IExpressionLoader;
