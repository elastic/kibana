/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoryUsage } from 'process';
import type { Logger } from '../../lib/utils/create_logger';

export function startPerformanceLogger({
  logger,
  interval = 5000,
}: {
  logger: Logger;
  interval?: number;
}) {
  function mb(value: number): string {
    return Math.round(value / 1024 ** 2).toString() + 'mb';
  }

  let cpuUsage = process.cpuUsage();

  const intervalId = setInterval(async () => {
    cpuUsage = process.cpuUsage(cpuUsage);
    const mem = memoryUsage();
    logger.debug(
      `cpu time: (user: ${Math.round(cpuUsage.user / 1000)}mss, sys: ${Math.round(
        cpuUsage.system / 1000
      )}ms), memory: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`
    );
  }, interval);

  return clearInterval.bind(null, intervalId);
}
