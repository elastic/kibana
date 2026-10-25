/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile, formatOperatorLabel } from './aggregate_esql_profile';

describe('aggregateEsqlProfile', () => {
  it('sums bytes and time across drivers and derives throughput from those sums', () => {
    const view = aggregateEsqlProfile({
      query: { took_millis: 2_000 },
      planning: { took_millis: 500 },
      parsing: { took_millis: 40 },
      drivers: [
        {
          description: 'data',
          node_name: 'node-a',
          operators: [
            {
              operator: 'ValuesSourceReaderOperator[fields = [body]]',
              status: {
                process_nanos: 1_000_000_000,
                rows_received: 100,
                rows_emitted: 100,
                bytes_read: 1_000,
                bytes_decoded: 1_000_000,
              },
            },
          ],
        },
        {
          description: 'data',
          node_name: 'node-b',
          operators: [
            {
              operator: 'ValuesSourceReaderOperator[fields = [body]]',
              status: {
                process_nanos: 3_000_000_000,
                rows_received: 300,
                rows_emitted: 50,
                bytes_read: 1_000,
                bytes_decoded: 1_000_000,
              },
            },
          ],
        },
      ],
      plans: [{ node_name: 'node-a', plan: 'Limit\n_LimitExec' }],
    });

    expect(view.queryTookMillis).toBe(2_000);
    expect(view.planningTookMillis).toBe(500);
    expect(view.executionTookMillis).toBe(1_500);
    expect(view.planningPhases).toEqual([{ id: 'parsing', tookMillis: 40 }]);
    expect(view.driverCount).toBe(2);
    expect(view.plans).toHaveLength(1);

    expect(view.operators).toHaveLength(1);
    const [reader] = view.operators;
    expect(reader.title).toBe('ValuesSourceReader');
    expect(reader.detail).toBe('[fields = [body]]');
    expect(reader.processNanos).toBe(4_000_000_000);
    expect(reader.rowsReceived).toBe(400);
    expect(reader.rowsEmitted).toBe(150);
    expect(reader.bytesRead).toBe(2_000);
    expect(reader.bytesDecoded).toBe(2_000_000);
    // 2e6 bytes / 4e9 ns = 5e5 bytes per second, not the average of the two rates.
    expect(reader.throughputBytesPerSecond).toBe(500_000);
    expect(reader.expansion).toBe(1_000);
    expect(reader.share).toBe(1);
    expect(reader.drivers).toHaveLength(2);
    expect(view.hasTimeline).toBe(false);
    expect(view.timeline).toEqual({ drivers: [] });
  });

  it('keeps time and rows when a reader does not report bytes_decoded', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            {
              operator: 'EvalOperator',
              status: {
                process_nanos: 2_000_000,
                rows_received: 10,
                rows_emitted: 4,
              },
            },
          ],
        },
      ],
    });

    expect(view.operators).toEqual([
      expect.objectContaining({
        title: 'Eval',
        processNanos: 2_000_000,
        rowsReceived: 10,
        rowsEmitted: 4,
        bytesDecoded: undefined,
        throughputBytesPerSecond: undefined,
        share: 1,
      }),
    ]);
  });

  it('orders operators by process time and splits shares across them', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            {
              operator: 'FastOperator',
              status: { process_nanos: 1, rows_received: 1, rows_emitted: 1 },
            },
            {
              operator: 'SlowOperator',
              status: { process_nanos: 3, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
      ],
    });

    expect(view.operators.map((operator) => operator.title)).toEqual(['Slow', 'Fast']);
    expect(view.operators[0].share).toBe(0.75);
    expect(view.operators[1].share).toBe(0.25);
    expect(view.operators.map((operator) => operator.pipelineIndex)).toEqual([1, 0]);
  });

  it('records pipeline order from the data driver when another driver is logged first', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          description: 'node_reduce',
          operators: [
            {
              operator: 'ExchangeOperator',
              status: { process_nanos: 5, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
        {
          description: 'data',
          operators: [
            {
              operator: 'LuceneSourceOperator',
              status: { process_nanos: 1, rows_received: 1, rows_emitted: 1 },
            },
            {
              operator: 'EvalOperator',
              status: { process_nanos: 9, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
      ],
    });

    expect(
      Object.fromEntries(view.operators.map((operator) => [operator.title, operator.pipelineIndex]))
    ).toEqual({
      LuceneSource: 0,
      Eval: 1,
      Exchange: 2,
    });
  });

  it('returns an empty view when the profile is missing', () => {
    expect(aggregateEsqlProfile(undefined)).toEqual({
      queryTookMillis: undefined,
      planningTookMillis: undefined,
      executionTookMillis: undefined,
      planningPhases: [],
      driverCount: 0,
      operators: [],
      plans: [],
      hasTimeline: false,
      timeline: { drivers: [] },
    });
  });

  it('builds a timeline from driver clocks and skips spans without one', () => {
    const view = aggregateEsqlProfile({
      planning: { took_millis: 5, start_millis: 1_000, stop_millis: 1_005 },
      drivers: [
        {
          description: 'data',
          node_name: 'node-a',
          start_millis: 1_005,
          stop_millis: 1_000,
          operators: [
            {
              operator: 'DroppedOperator',
              status: { process_nanos: 9, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
        {
          description: 'data',
          node_name: 'node-b',
          start_millis: 1_010,
          stop_millis: 1_050,
          took_nanos: 40_000_000,
          cpu_nanos: 30_000_000,
          operators: [
            {
              operator: 'LimitOperator',
              status: { process_nanos: 1, rows_received: 2, rows_emitted: 2 },
            },
            {
              operator: 'ValuesSourceReaderOperator[fields = [body]]',
              status: { process_nanos: 3, rows_received: 4, rows_emitted: 4 },
            },
          ],
        },
        {
          description: 'final',
          operators: [
            {
              operator: 'OutputOperator',
              status: { process_nanos: 1, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
      ],
    });

    expect(view.hasTimeline).toBe(true);
    expect(view.timeline.planning).toEqual({ startMillis: 1_000, stopMillis: 1_005 });
    expect(view.timeline.drivers).toHaveLength(1);
    expect(view.timeline.drivers[0]).toEqual(
      expect.objectContaining({
        id: '1',
        description: 'data',
        nodeName: 'node-b',
        label: 'data · node-b',
        startMillis: 1_010,
        stopMillis: 1_050,
        tookNanos: 40_000_000,
        cpuNanos: 30_000_000,
      })
    );
    expect(view.timeline.drivers[0].operators.map((operator) => operator.title)).toEqual([
      'Limit',
      'ValuesSourceReader',
    ]);
    expect(view.timeline.drivers[0].operators[0].share).toBe(0.25);
    expect(view.timeline.drivers[0].operators[1].share).toBe(0.75);
    expect(view.operators.map((operator) => operator.title)).toContain('Dropped');
  });

  it('does not open a timeline when no driver has a clock', () => {
    const view = aggregateEsqlProfile({
      planning: { start_millis: 1, stop_millis: 2, took_millis: 1 },
      drivers: [
        {
          operators: [
            {
              operator: 'EvalOperator',
              status: { process_nanos: 1, rows_received: 1, rows_emitted: 1 },
            },
          ],
        },
      ],
    });

    expect(view.hasTimeline).toBe(false);
    expect(view.timeline.drivers).toEqual([]);
    expect(view.timeline.planning).toEqual({ startMillis: 1, stopMillis: 2 });
  });
});

describe('formatOperatorLabel', () => {
  it('keeps the bracketed detail and drops the Operator suffix', () => {
    expect(formatOperatorLabel('LuceneSourceOperator[index=logs]')).toEqual({
      title: 'LuceneSource',
      detail: '[index=logs]',
    });
  });
});
