/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 * Represents a meta-information about a Kibana entity initiating a search request.
 */
// use type to make it compatible with SerializableState
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KibanaExecutionContext = {
  /**
   * Kibana application initated an operation.
   * */
  readonly type?: string; // 'visualization' | 'actions' | 'server' | ..;
  /** public name of an application or a user-facing feature */
  readonly name?: string; // 'TSVB' | 'Lens' |  'action_execution' | ..;
  /** a stand alone, logical unit such as an application page or tab */
  readonly page?: string;
  /** unique value to identify the source */
  readonly id?: string;
  /** human readable description. For example, a vis title, action name */
  readonly description?: string;
  /** in browser - url to navigate to a current page, on server - endpoint path, for task: task SO url */
  readonly url?: string;
  /** an inner context spawned from the current context. */
  child?: KibanaExecutionContext;
};
