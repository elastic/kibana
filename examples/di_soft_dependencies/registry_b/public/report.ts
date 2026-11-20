/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, ServiceTypeOf } from '@kbn/core-di';

declare global {
  interface Window {
    __diSoftDeps?: Record<string, object>;
  }
}

export const report = (logger: ServiceTypeOf<typeof Logger>, status: { id: string }): void => {
  window.__diSoftDeps = { ...window.__diSoftDeps, [status.id]: status };
  logger.info(`[diSoftDeps] ${status.id} ${JSON.stringify(status)}`);
};
