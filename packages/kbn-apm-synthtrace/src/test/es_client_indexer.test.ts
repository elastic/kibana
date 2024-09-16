/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { pick, range, sum } from 'lodash';
import { Readable } from 'stream';
import { ApmSynthtraceEsClient } from '../lib/apm/client/apm_synthtrace_es_client';

describe('Synthtrace ES Client indexer', () => {
  let apmEsClient: ApmSynthtraceEsClient;
  let datasource: Readable;

  async function toArray(readable: Readable) {
    const arr: any[] = [];
    for await (const chunk of readable) {
      arr.push(chunk);
    }
    return arr;
  }

  beforeEach(() => {
    const opts = {
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      },
      target: '',
      version: '',
      client: {
        cluster: {
          getComponentTemplate: async () => {
            return {
              component_templates: [],
            };
          },
        },
        helpers: {
          bulk: async (options: any) => {
            datasource = options.datasource;
            return undefined;
          },
        },
      },
    } as unknown as ConstructorParameters<typeof ApmSynthtraceEsClient>[0];

    apmEsClient = new ApmSynthtraceEsClient(opts);
  });

  it('indexes documents', async () => {
    const instance = apm.service('foo', 'java', 'java').instance('foo');

    const generator = timerange(
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-01-01T01:00:01.000Z')
    )
      .interval('30m')
      .generator((timestamp) => {
        return instance
          .transaction('GET /foo')
          .duration(100)
          .timestamp(timestamp)
          .outcome('success');
      });

    await apmEsClient.index(generator);

    const events = await toArray(datasource);

    expect(events.length).toMatchInlineSnapshot(`33`);

    const mapped = events.map((event) =>
      pick(event, '@timestamp', 'processor.event', 'metricset.name')
    );

    expect(mapped).toMatchSnapshot();
  });

  it('lazily generates new data', async () => {
    // One issue with this test is that there is a certain amount of events needed
    // to trigger backpressure mechanisms. And it is unclear to me at what amount
    // it kicks in. fork(), sequential() and the fact that we use pipeline() and
    // the ES client uses for-await-of, which triggers the readable API, might all
    // be factors in the complexity around this.
    // see also: https://nodejs.org/api/stream.html#choose-one-api-style

    const instance = apm.service('foo', 'production', 'java').instance('foo');

    const generatorCallback = jest.fn((timestamp: number) => {
      return range(0, 50).map(() =>
        instance.transaction('GET /foo').duration(100).timestamp(timestamp).outcome('success')
      );
    });

    const getGenerator = () =>
      timerange(new Date('2022-01-01T00:00:00.000Z'), new Date('2022-01-01T00:59:59.999Z'))
        .interval('20m')
        .rate(10)
        .generator(generatorCallback);

    await apmEsClient.index(getGenerator());

    const expectedTotalCalls = 30;

    const events: any[] = [];

    for await (const event of datasource) {
      events.push(event);
      expect(generatorCallback.mock.calls.length).toBeLessThan(expectedTotalCalls);
      break;
    }

    expect(events.length).toBeGreaterThanOrEqual(1);

    generatorCallback.mockClear();

    await apmEsClient.index(getGenerator());

    await toArray(datasource);

    expect(generatorCallback.mock.calls.length).toBe(expectedTotalCalls);
  });

  it('creates the expected transaction metrics', async () => {
    const serviceA = apm.service('service-a', 'production', 'java').instance('one');
    const serviceB = apm.service('service-b', 'production', 'java').instance('one');

    const MINUTES = 7;
    const CARDINALITY = 2;
    // this rate needs to be high to take backpressure scenarios into account
    const RATE = 300;

    const AVG_DURATION_A = 1000;

    const timestamps: string[] = [];

    const generator = timerange(
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-01-01T00:06:59.999Z')
    )
      .interval('1m')
      .rate(RATE)
      .generator((timestamp) => {
        timestamps.push(new Date(timestamp).toISOString());

        return [
          serviceA.transaction('GET /service-a/one').duration(AVG_DURATION_A).timestamp(timestamp),
          serviceB.transaction('GET /service-b/one').duration(500).timestamp(timestamp),
        ];
      });

    await apmEsClient.index(generator);

    const events = await toArray(datasource);

    const transactions = events.filter((event) => event.processor.event === 'transaction');

    expect(transactions.length).toBe(RATE * CARDINALITY * MINUTES);

    const txMetrics = events.filter(
      (event) => event.metricset?.name === 'transaction' && event.metricset?.interval === '1m'
    );

    expect(txMetrics.length).toBe(MINUTES * CARDINALITY);

    const txMetricsForA = txMetrics.filter((event) => event.service.name === 'service-a');

    expect(txMetricsForA.length).toBe(MINUTES);

    expect(txMetricsForA[0]._doc_count).toBe(RATE);

    const values = txMetricsForA.flatMap((metric) => {
      const vals: number[] = [];
      metric.transaction.duration.histogram.values.forEach((value: number, index: number) => {
        const counts = metric.transaction.duration.histogram.counts[index];
        vals.push(...range(0, counts).fill(value));
      });
      return vals;
    });

    expect(values.length).toBe(RATE * MINUTES);

    expect(sum(values) / values.length).toBe(AVG_DURATION_A * 1000);
  });
});
export {};
