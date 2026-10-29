/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { remotable } from '@kbn/core-remote-common';
import type { Logger } from '@kbn/logging';
import type { WorkflowLogApi } from './tokens';

/** Coordinator-side log sink. The worker calls this; it does not construct a Kibana logger. */
@remotable()
export class WorkflowLog implements WorkflowLogApi {
  constructor(private readonly logger: Logger) {}

  info(message: string): void {
    this.logger.info(message);
  }
}
