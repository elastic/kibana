/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { ExecutionIoType } from './execution_io_id';

/** One input or output value for a step or workflow execution. */
export interface EsExecutionIo {
  id: string;
  executionId: string;
  type: ExecutionIoType;
  /** Byte length. Absent when the value was read from a legacy execution document. */
  size?: number;
  value?: JsonValue | null;
  '@timestamp': string;
}
