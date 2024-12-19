/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './from';
import { stats } from './stats';

describe('stats', () => {
  const source = from('logs-*');

  it('handles a basic STATS command', () => {
    const pipeline = source.pipe(
      stats('avg_duration = AVG(transaction.duration.us) BY service.name')
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS avg_duration = AVG(transaction.duration.us) BY service.name'
    );
    expect(pipeline.getBindings()).toEqual([]);
  });

  it('handles STATS with bindings', () => {
    const pipeline = source.pipe(
      stats('AVG(?duration), COUNT(?svcName) BY ?env', {
        duration: {
          identifier: 'transaction.duration.us',
        },
        svcName: {
          identifier: 'service.name',
        },
        env: {
          identifier: 'service.environment',
        },
      })
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS AVG(?duration), COUNT(?svcName) BY ?env'
    );
    expect(pipeline.getBindings()).toEqual([
      {
        duration: {
          identifier: 'transaction.duration.us',
        },
      },
      {
        svcName: {
          identifier: 'service.name',
        },
      },
      {
        env: {
          identifier: 'service.environment',
        },
      },
    ]);
  });

  it('handles STATS with WHERE and BY', () => {
    const pipeline = source.pipe(
      stats('avg_duration = AVG(transaction.duration.us)')
        .where({
          'log.level': 'error',
        })
        .by('service.name')
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS avg_duration = AVG(transaction.duration.us) WHERE log.level == ? BY service.name'
    );
    expect(pipeline.getBindings()).toEqual(['error']);
  });

  it('handles STATS and BY with bindings', () => {
    const pipeline = source.pipe(
      stats('avg_duration = AVG(transaction.duration.us)').by('?svcName', {
        svcName: { identifier: 'service.name' },
      })
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS avg_duration = AVG(transaction.duration.us) BY ?svcName'
    );
    expect(pipeline.getBindings()).toEqual([
      {
        svcName: {
          identifier: 'service.name',
        },
      },
    ]);
  });

  it('handles STATS and BY with multiple fields', () => {
    const pipeline = source.pipe(
      stats('avg_duration = AVG(transaction.duration.us)').by(['?svcName', '?svcEnv'], {
        svcName: { identifier: 'service.name' },
        svcEnv: { identifier: 'service.environment' },
      })
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS avg_duration = AVG(transaction.duration.us) BY ?svcName, ?svcEnv'
    );
    expect(pipeline.getBindings()).toEqual([
      {
        svcName: {
          identifier: 'service.name',
        },
      },
      {
        svcEnv: {
          identifier: 'service.environment',
        },
      },
    ]);
  });

  it('handles multiple chained STATS', () => {
    const pipeline = source.pipe(
      stats('avg_duration = AVG(transaction.duration.us)')
        .concat('max_duration = MAX(transaction.duration.us)')
        .where('@timestamp > ?', '2021-01-01')
        .concat('min_duration = MIN(transaction.duration.us)')
        .where({
          'service.name': 'service2',
        })
        .by('service.environment')
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| STATS avg_duration = AVG(transaction.duration.us), max_duration = MAX(transaction.duration.us) WHERE @timestamp > ?, min_duration = MIN(transaction.duration.us) WHERE service.name == ? BY service.environment'
    );
    expect(pipeline.getBindings()).toEqual(['2021-01-01', 'service2']);
  });
});
