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
export declare interface SharedUXExecutionContext {
  /**
   * Kibana application initiated an operation.
   * */
  readonly type?: string;
  /** public name of an application or a user-facing feature */
  readonly name?: string;
  /** a stand alone, logical unit such as an application page or tab */
  readonly page?: string;
  /** unique value to identify the source */
  readonly id?: string;
  /** human readable description. For example, a vis title, action name */
  readonly description?: string;
  /** in browser - url to navigate to a current page, on server - endpoint path, for task: task SO url */
  readonly url?: string;
  /** Metadata attached to the field. An optional parameter that allows to describe the execution context in more detail. **/
  readonly meta?: {
    [key: string]: string | number | boolean | undefined;
  };
  /** an inner context spawned from the current context. */
  child?: SharedUXExecutionContext;
}
