/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';

const TerminalStatus: readonly ExecutionStatus[] = [
  ExecutionStatus.COMPLETED,
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.SKIPPED,
  ExecutionStatus.TIMED_OUT,
];

const CancelableStatus: readonly ExecutionStatus[] = [
  ExecutionStatus.RUNNING,
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.PENDING,
];

export const isTerminalStatus = (status: ExecutionStatus) => TerminalStatus.includes(status);
export const isCancelableStatus = (status: ExecutionStatus) => CancelableStatus.includes(status);
