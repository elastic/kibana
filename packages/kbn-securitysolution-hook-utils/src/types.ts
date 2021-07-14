/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Represents the state of an asynchronous task, along with an initiator
 * function to kick off the work.
 */
export interface Task<Args extends unknown[], Result> {
  loading: boolean;
  error: unknown | undefined;
  result: Result | undefined;
  start: (...args: Args) => void;
}
