/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  CompilerRunningMsg,
  CompilerIssueMsg,
  CompilerSuccessMsg,
  CompilerErrorMsg,
} from './compiler_messages';

export type WorkerMsg =
  | CompilerRunningMsg
  | CompilerIssueMsg
  | CompilerSuccessMsg
  | CompilerErrorMsg
  | WorkerErrorMsg;

/**
 * Message sent when the worker encounters an error that it can't
 * recover from, no more messages will be sent and the worker
 * will exit after this message.
 */
export interface WorkerErrorMsg {
  type: 'worker error';
  errorMsg: string;
  errorStack?: string;
}

const WORKER_STATE_TYPES: ReadonlyArray<WorkerMsg['type']> = [
  'running',
  'compiler issue',
  'compiler success',
  'compiler error',
  'worker error',
];

export const isWorkerMsg = (value: any): value is WorkerMsg =>
  typeof value === 'object' && value && WORKER_STATE_TYPES.includes(value.type);

export class WorkerMsgs {
  error(error: Error): WorkerErrorMsg {
    return {
      type: 'worker error',
      errorMsg: error.message,
      errorStack: error.stack,
    };
  }
}
