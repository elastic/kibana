/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EcsEvent } from '@elastic/ecs';
import type { AuditEvent } from '@kbn/security-plugin/server';

export type AuditAction = 'create' | 'delete';

interface CreateAuditEventArgs {
  message: string;
  action: AuditAction;
  error?: Error;
  outcome?: EcsEvent['outcome'];
}

const getOutcome = (error?: Error, outcome?: EcsEvent['outcome']) => {
  if (outcome) {
    return outcome;
  }
  return error ? 'failure' : 'success';
};

export function createAuditEvent({
  message,
  action,
  error,
  outcome,
}: CreateAuditEventArgs): AuditEvent {
  return {
    message,
    event: {
      action,
      outcome: getOutcome(error, outcome),
    },
    error: error && {
      message: error?.message,
    },
  };
}
