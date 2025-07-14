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
import { limit } from './commands/limit';
import { SortOrder, sort } from './commands/sort';
import { stats } from './commands/stats';
import { where } from './commands/where';

describe('composer', () => {
  const source = from('logs-*');

  it('returns query in string format', () => {
    const pipeline = source.pipe(
      where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
      stats(`avg_duration = AVG(transaction.duration.us) BY service.name`),
      keep('@timestamp', 'avg_duration', 'service.name'),
      sort('avg_duration', { '@timestamp': SortOrder.Desc })
    );

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n  | STATS avg_duration = AVG(transaction.duration.us) BY service.name\n  | KEEP @timestamp, avg_duration, service.name\n  | SORT avg_duration ASC, @timestamp DESC'
    );
  });

  it('returns query in request format', () => {
    const pipeline = source.pipe(
      where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
      stats(`avg_duration = ?func(??duration) BY service.name`, {
        func: 'AVG',
        duration: 'transaction.duration.us',
      }),
      keep('@timestamp', 'avg_duration', 'service.name'),
      sort('avg_duration', { '@timestamp': SortOrder.Desc })
    );

    expect(pipeline.asRequest()).toEqual({
      query:
        'FROM logs-*\n  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n  | STATS avg_duration = ?FUNC(??duration) BY service.name\n  | KEEP @timestamp, avg_duration, service.name\n  | SORT avg_duration ASC, @timestamp DESC',
      params: [
        {
          func: 'AVG',
          duration: 'transaction.duration.us',
        },
      ],
    });
  });

  it('escapes malicious query parameter', () => {
    const pipeline = source.pipe(
      where(`service.name == ?malicious"`, {
        malicious: '"malicious" OR 1=1 --',
      })
    );

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | WHERE service.name == "\\"malicious\\" OR 1=1 --"'
    );
  });

  it('should build query from multiple `pipe` calls', () => {
    let pipeline = source.pipe(where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`));
    pipeline = pipeline.pipe(stats(`avg_duration = AVG(transaction.duration.us) BY service.name`));
    pipeline = pipeline.pipe(keep('@timestamp', 'avg_duration', 'service.name'));
    pipeline = pipeline.pipe(sort('avg_duration', { '@timestamp': SortOrder.Desc }));

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n  | STATS avg_duration = AVG(transaction.duration.us) BY service.name\n  | KEEP @timestamp, avg_duration, service.name\n  | SORT avg_duration ASC, @timestamp DESC'
    );
  });

  it('appends commands conditionally using pipeIf', () => {
    const pipeline = source
      .pipe(where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`))
      .pipeIf(
        true,
        stats(`avg_duration = AVG(transaction.duration.us) BY service.name`),
        keep('@timestamp', 'avg_duration', 'service.name')
      )
      .pipe(sort({ '@timestamp': SortOrder.Desc }))
      .pipeIf(false, limit(100));

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n  | STATS avg_duration = AVG(transaction.duration.us) BY service.name\n  | KEEP @timestamp, avg_duration, service.name\n  | SORT @timestamp DESC'
    );
  });
});
