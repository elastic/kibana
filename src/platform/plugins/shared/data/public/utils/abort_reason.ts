/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum AbortReason {
  /**
   * The request was aborted due to reaching the `search:timeout` advanced setting.
   */
  Timeout = 'timeout',

  /**
   * The request was aborted because the background search (search session) was canceled.
   */
  SessionCanceled = 'session_canceled',

  /**
   * The request was aborted because the data was replaced by a new request (refreshed/re-fetched).
   */
  Replaced = 'replaced',

  /**
   * The request was aborted because the component unmounted.
   */
  Cleanup = 'cleanup',

  /**
   * The request was aborted because the user explicitly canceled it.
   */
  Canceled = 'canceled',
}
