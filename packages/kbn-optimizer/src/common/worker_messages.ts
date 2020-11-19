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
