/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// if we need any context value in this machine we should turn this into a typestate union
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogStreamPageContext {}

// this is a placeholder and should be turned into a union of event objects
export interface LogStreamPageEvent {
  type: string;
}
