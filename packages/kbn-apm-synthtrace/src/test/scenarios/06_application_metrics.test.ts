/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pick } from 'lodash';
import { apm } from '../../lib/apm';
import { Instance } from '../../lib/apm/instance';

describe('application metrics', () => {
  let instance: Instance;
  const timestamp = new Date('2021-01-01T00:00:00.000Z').getTime();

  beforeEach(() => {
    instance = apm.service('opbeans-java', 'production', 'java').instance('instance');
  });
  it('generates application metricsets', () => {
    const events = instance
      .appMetrics({
        'system.memory.actual.free': 80,
        'system.memory.total': 100,
      })
      .timestamp(timestamp)
      .serialize();

    const appMetrics = events.filter((event) => event['processor.event'] === 'metric');

    expect(appMetrics.length).toEqual(1);

    expect(
      pick(
        appMetrics[0],
        '@timestamp',
        'agent.name',
        'container.id',
        'metricset.name',
        'processor.event',
        'processor.name',
        'service.environment',
        'service.name',
        'service.node.name',
        'system.memory.actual.free',
        'system.memory.total'
      )
    ).toEqual({
      '@timestamp': timestamp,
      'metricset.name': 'app',
      'processor.event': 'metric',
      'processor.name': 'metric',
      'system.memory.actual.free': 80,
      'system.memory.total': 100,
      ...pick(
        instance.fields,
        'agent.name',
        'container.id',
        'service.environment',
        'service.name',
        'service.node.name'
      ),
    });
  });
});
