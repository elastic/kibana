/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @internal */
export interface KibanaExecutionContext {
  readonly requestId: string;
  /**
   * Kibana application initated an operation.
   * Can be narrowed to an enum later.
   * */
  readonly type: string; // 'visualization' | 'actions' | 'server' | ..;
  /** public name of a user-facing feature */
  readonly name: string; // 'TSVB' | 'Lens' |  'action_execution' | ..;
  /** unique value to indentify find the source */
  readonly id: string;
  /** human readable description. For example, a vis title, action name */
  readonly description: string;
  /** in browser - url to navigate to a current page, on server - endpoint path, for task: task SO url */
  readonly url?: string;
}
