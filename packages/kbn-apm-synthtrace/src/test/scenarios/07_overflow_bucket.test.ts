/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange, ApmFields } from '@kbn/apm-synthtrace-client';
import { range as lodashRange, sortBy } from 'lodash';
import { Readable } from 'stream';
import { createTransactionMetricsAggregator } from '../../lib/apm/aggregators/create_transaction_metrics_aggregator';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';

describe('Overflow Bucket for Tx Metrics', () => {
  let events: Array<Record<string, any>>;
  const TOTAL_NUMBER_OF_SERVICES = 10;
  const TOTAL_NUMBER_OF_TRANSACTIONS = 10;
  const OVERFLOW_BUCKET_NAME = '_other';

  const options = {
    overflowSettings: {
      maxGroups: 10000,
      transactions: {
        maxServices: 3,
        maxTransactionGroupsPerService: 4,
      },
    },
  };

  beforeEach(async () => {
    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z'),
      new Date('2021-01-01T00:15:00.000Z')
    );

    const ENVIRONMENTS = ['production'];
    const TRANSACTION_TYPES = ['request'];

    const MIN_DURATION = 10;
    const MAX_DURATION = 1000;

    const MAX_BUCKETS = 50;

    const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

    const serviceRange = lodashRange(0, TOTAL_NUMBER_OF_SERVICES).map(
      (groupId) => `service-${groupId}`
    );

    const instances = serviceRange.flatMap((serviceName) => {
      const services = ENVIRONMENTS.map((env) =>
        apm.service({
          name: serviceName,
          environment: env,
          agentName: 'go',
        })
      );

      return lodashRange(0, 2).flatMap((serviceNodeId) =>
        services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
      );
    });

    const transactionGroupRange = lodashRange(0, TOTAL_NUMBER_OF_TRANSACTIONS).map(
      (groupId) => `transaction-${groupId}`
    );

    const serialized = [
      ...Array.from(
        range
          .interval('1m')
          .rate(1)
          .generator((timestamp, timestampIndex) => {
            return instances.flatMap((instance) =>
              transactionGroupRange.flatMap((groupId, groupIndex) => {
                const duration = Math.round(
                  (timestampIndex % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION
                );

                return instance
                  .transaction(groupId, TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length])
                  .timestamp(timestamp)
                  .duration(duration)
                  .success();
              })
            );
          })
      ),
    ].flatMap((event) => event.serialize());

    events = (
      await awaitStream<ApmFields>(
        Readable.from(sortBy(serialized, '@timestamp')).pipe(
          createTransactionMetricsAggregator('1m', options)
        )
      )
    ).filter((field) => field['metricset.name'] === 'transaction');
  });

  it('generates the right amount of transaction metrics', () => {
    expect(events.length).toBe(420);
  });

  it('should generate the right number of services and a service overflow bucket', () => {
    const serviceList = new Set<string>();

    events.forEach((event) => {
      serviceList.add(event['service.name']);
    });

    expect(serviceList.size).toBe(options.overflowSettings.transactions.maxServices + 1);
    expect(serviceList.has(OVERFLOW_BUCKET_NAME)).toBe(true);
  });

  it('should set the right overflow count for service overflow bucket', () => {
    const serviceOverflowList = events.filter(
      (event) => event['service.name'] === OVERFLOW_BUCKET_NAME
    );

    serviceOverflowList.forEach((event) => {
      expect(event['transaction.aggregation.overflow_count']).toBe(140);
    });
  });

  it('should generate right the right number of transactions and a transactions overflow bucket per service', () => {
    const serviceMap = new Map<string, Set<string>>();

    events.forEach((event) => {
      const service = event['service.name'];
      const transaction = event['transaction.name'];

      if (!serviceMap.has(service)) {
        serviceMap.set(service, new Set());
      }

      serviceMap.get(service)!.add(transaction);
    });

    Object.keys(serviceMap).forEach((service) => {
      if (service !== OVERFLOW_BUCKET_NAME) {
        expect(serviceMap.get(service)!.size).toBe(
          options.overflowSettings.transactions.maxTransactionGroupsPerService + 1
        );
        expect(serviceMap.get(service)!.has(OVERFLOW_BUCKET_NAME)).toBe(true);
      }
    });
  });

  it('should set the right count for transaction overflow bucket', () => {
    const transactionOverflowList = events.filter(
      (event) => event['transaction.name'] === OVERFLOW_BUCKET_NAME
    );

    transactionOverflowList.forEach((event) => {
      expect(event['transaction.aggregation.overflow_count']).toBe(12);
    });
  });
});
