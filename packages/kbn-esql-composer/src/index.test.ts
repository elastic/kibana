/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './commands/from';
import { keep } from './commands/keep';
import { SortOrder, sort } from './commands/sort';
import { stats } from './commands/stats';
import { where } from './commands/where';

describe('composer', () => {
  const source = from('logs-*');

  it('applies operators in order', () => {
    const pipeline = source.pipe(
      where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
      stats(`avg_duration = AVG(transaction.duration.us) BY service.name`)
    );

    expect(pipeline.asQuery()).toEqual(
      `FROM \`logs-*\`\n\t| WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n\t| STATS avg_duration = AVG(transaction.duration.us) BY service.name`
    );
  });

  it('applies many operators', () => {
    const pipeline = source.pipe(
      where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
      stats(`avg_duration = AVG(transaction.duration.us) BY service.name`),
      keep('@timestamp', 'avg_duration', 'service.name'),
      sort('avg_duration', { '@timestamp': SortOrder.Desc })
    );

    expect(pipeline.asQuery()).toEqual(
      `FROM \`logs-*\`\n\t| WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n\t| STATS avg_duration = AVG(transaction.duration.us) BY service.name\n\t| KEEP \`@timestamp\`, \`avg_duration\`, \`service.name\`\n\t| SORT avg_duration ASC, @timestamp DESC`
    );
  });

  it('applies many operators with fluent', () => {
    const pipeline = source.pipe(
      where('host.name == ?', 'host2')
        .and(() =>
          where({ 'log.level': 'warning' })
            .or({ 'log.message': 'debug' })
            .or({ 'log.message': 'info' })
            .or({ 'log.level': 'error' })
        )
        .or(() =>
          where(() => where('host.name == ?', 'host1').or('host.name == ?', 'host2')).and(() =>
            where('service.name == ?', 'service1').or('service.name == ?', 'service2')
          )
        ),
      stats('avg_duration = AVG(transaction.duration.us)')
        .where({
          'log.level': 'error',
        })
        .concat('min_duration = MIN(transaction.duration.us)')
        .by('?svcName', { svcName: { identifier: 'service.name' } }),
      sort('avg_duration', { '@timestamp': SortOrder.Desc })
    );

    expect(pipeline.asQuery()).toEqual(
      `FROM \`logs-*\`\n\t| WHERE host.name == ? AND (log.level == ? OR log.message == ? OR log.message == ? OR log.level == ?) OR ((host.name == ? OR host.name == ?) AND (service.name == ? OR service.name == ?))\n\t| STATS avg_duration = AVG(transaction.duration.us) WHERE log.level == ?, min_duration = MIN(transaction.duration.us) BY ?svcName\n\t| SORT avg_duration ASC, @timestamp DESC`
    );

    expect(pipeline.asString()).toEqual(
      `FROM \`logs-*\`\n\t| WHERE host.name == "host2" AND (log.level == "warning" OR log.message == "debug" OR log.message == "info" OR log.level == "error") OR ((host.name == "host1" OR host.name == "host2") AND (service.name == "service1" OR service.name == "service2"))\n\t| STATS avg_duration = AVG(transaction.duration.us) WHERE log.level == "error", min_duration = MIN(transaction.duration.us) BY service.name\n\t| SORT avg_duration ASC, @timestamp DESC`
    );
  });
});
