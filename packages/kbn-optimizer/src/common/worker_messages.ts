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
  CompilerRunningMessage,
  CompilerIssueMessage,
  CompilerSuccessMessage,
  CompilerErrorMessage,
} from './compiler_messages';

export type WorkerMessage =
  | CompilerRunningMessage
  | CompilerIssueMessage
  | CompilerSuccessMessage
  | CompilerErrorMessage
  | WorkerErrorMessage;

/**
 * Message sent when the worker encounters an error that it can't
 * recover from, no more messages will be sent and the worker
 * will exit after this message.
 */
export interface WorkerErrorMessage {
  type: 'worker error';
  errorMessage: string;
  errorStack?: string;
}

const WORKER_STATE_TYPES: ReadonlyArray<WorkerMessage['type']> = [
  'running',
  'compiler issue',
  'compiler success',
  'compiler error',
  'worker error',
];

export const isWorkerMessage = (value: any): value is WorkerMessage =>
  typeof value === 'object' && value && WORKER_STATE_TYPES.includes(value.type);

export class WorkerMessages {
  error(error: Error): WorkerErrorMessage {
    return {
      type: 'worker error',
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
}
