/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type MessageTypes = 'verbose' | 'debug' | 'info' | 'success' | 'warning' | 'error' | 'write';

export interface Message {
  type: MessageTypes;
  indent: number;
  args: any[];
}
