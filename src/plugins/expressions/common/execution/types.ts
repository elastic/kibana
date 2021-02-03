/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { KibanaRequest } from 'src/core/server';

import { ExpressionType, SerializableState } from '../expression_types';
import { Adapters, RequestAdapter } from '../../../inspector/common';
import { SavedObject, SavedObjectAttributes } from '../../../../core/public';
import { TablesAdapter } from '../util/tables_adapter';

/**
 * `ExecutionContext` is an object available to all functions during a single execution;
 * it provides various methods to perform side-effects.
 */
export interface ExecutionContext<
  InspectorAdapters extends Adapters = Adapters,
  ExecutionContextSearch extends SerializableState = SerializableState
> {
  /**
   * Get search context of the expression.
   */
  getSearchContext: () => ExecutionContextSearch;

  /**
   * Context variables that can be consumed using `var` and `var_set` functions.
   */
  variables: Record<string, unknown>;

  /**
   * A map of available expression types.
   */
  types: Record<string, ExpressionType>;

  /**
   * Adds ability to abort current execution.
   */
  abortSignal: AbortSignal;

  /**
   * Adapters for `inspector` plugin.
   */
  inspectorAdapters: InspectorAdapters;

  /**
   * Search context in which expression should operate.
   */
  getSearchSessionId: () => string | undefined;

  /**
   * Getter to retrieve the `KibanaRequest` object inside an expression function.
   * Useful for functions which are running on the server and need to perform
   * operations that are scoped to a specific user.
   */
  getKibanaRequest?: () => KibanaRequest;

  /**
   * Allows to fetch saved objects from ElasticSearch. In browser `getSavedObject`
   * function is provided automatically by the Expressions plugin. On the server
   * the caller of the expression has to provide this context function. The
   * reason is because on the browser we always know the user who tries to
   * fetch a saved object, thus saved object client is scoped automatically to
   * that user. However, on the server we can scope that saved object client to
   * any user, or even not scope it at all and execute it as an "internal" user.
   */
  getSavedObject?: <T extends SavedObjectAttributes = SavedObjectAttributes>(
    type: string,
    id: string
  ) => Promise<SavedObject<T>>;

  /**
   * Returns the state (true|false) of the sync colors across panels switch.
   */
  isSyncColorsEnabled?: () => boolean;
}

/**
 * Default inspector adapters created if inspector adapters are not set explicitly.
 */
export interface DefaultInspectorAdapters extends Adapters {
  requests: RequestAdapter;
  tables: TablesAdapter;
}
