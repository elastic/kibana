/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { host } from './host';

describe('host', () => {
  it('creates process metrics for the host', () => {
    const fields = host('host-1')
      .process({
        'process.pid': 1000,
        'process.command_line': '/usr/sbin/cron -f',
        'user.name': 'root',
        'system.process.state': 'sleeping',
        'system.process.cpu.total.pct': 0.1,
        'system.process.memory.rss.pct': 0.2,
        'system.process.cpu.start_time': 1700000000000,
      })
      .serialize()[0];

    expect(fields).toMatchObject({
      'host.name': 'host-1',
      'event.module': 'system',
      'event.dataset': 'system.process',
      'metricset.name': 'process',
      'process.pid': 1000,
      'process.command_line': '/usr/sbin/cron -f',
    });
  });

  it('creates process summary metrics for the host', () => {
    const fields = host('host-1')
      .processSummary({ 'system.process.summary.total': 2, 'system.process.summary.running': 2 })
      .serialize()[0];

    expect(fields).toMatchObject({
      'host.name': 'host-1',
      'event.module': 'system',
      'event.dataset': 'system.process.summary',
      'metricset.name': 'process_summary',
      'system.process.summary.total': 2,
    });
  });
});
