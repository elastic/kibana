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

import { ExpressionType } from '../expression_types';
import { DataAdapter, RequestAdapter } from '../../../inspector/common';
import { TimeRange, Query, Filter } from '../../../data/common';
import { SavedObject, SavedObjectAttributes } from '../../../../core/public';

/**
 * `ExecutionContext` is an object available to all functions during a single execution;
 * it provides various methods to perform side-effects.
 */
export interface ExecutionContext<Input = unknown, InspectorAdapters = DefaultInspectorAdapters> {
  /**
   * Get initial input with which execution started.
   */
  getInitialInput: () => Input;

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
  search?: ExecutionContextSearch;

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
}

/**
 * Default inspector adapters created if inspector adapters are not set explicitly.
 */
export interface DefaultInspectorAdapters {
  requests: RequestAdapter;
  data: DataAdapter;
}

export interface ExecutionContextSearch {
  filters?: Filter[];
  query?: Query | Query[];
  timeRange?: TimeRange;
}
