/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Meter, metrics, ValueType } from '@opentelemetry/api';
import v8 from 'v8';
import { EventLoopUtilizationMonitor } from './event_loop_utilization_monitor';
import { EventLoopDelaysMonitor } from './event_loop_delays_monitor';

export function registerOtelMetrics() {
  // scope.name: "kibana.process"
  const meter = metrics.getMeter('kibana.process');

  // opentelemetry.io/docs/specs/semconv/system/process-metrics/#metric-processuptime
  meter
    .createObservableGauge('process.uptime', {
      description: 'Process Uptime: The time the process has been running.',
      unit: 's',
      valueType: ValueType.DOUBLE,
    })
    .addCallback((result) => {
      result.observe(process.uptime());
    });

  registerOtelEventLoopDelayMetrics(meter);
  registerOtelEventLoopUtilizationMetrics(meter);
  registerOtelMemoryMetrics(meter);
}

function registerOtelMemoryMetrics(meter: Meter) {
  const memoryMetrics = {
    // https://opentelemetry.io/docs/specs/semconv/runtime/v8js-metrics/
    limit: meter.createObservableUpDownCounter('v8js.memory.heap.limit', {
      description: 'Process Memory: Total heap available.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    used: meter.createObservableUpDownCounter('v8js.memory.heap.used', {
      description: 'Process Memory: Used heap size.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    available: meter.createObservableUpDownCounter('v8js.memory.heap.available_size', {
      description: 'Process Memory: Available heap size.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    physical: meter.createObservableUpDownCounter('v8js.memory.heap.physical_size', {
      description: 'Process Memory: Committed size of a heap space.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    // Following this convention: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/#metric-processmemoryusage
    rss: meter.createObservableUpDownCounter('process.memory.rss', {
      description:
        'Process Memory: Resident Set Size, is the amount of space occupied in the main memory device (that is a subset of the total allocated memory) for the process, including all C++ and JavaScript objects and code.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    external: meter.createObservableUpDownCounter('process.memory.external', {
      description:
        'Process Memory: memory usage of C++ objects bound to JavaScript objects managed by V8.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    arrayBuffers: meter.createObservableUpDownCounter('process.memory.array_buffers', {
      description:
        'Process Memory: Refers to memory allocated for `ArrayBuffer`s and `SharedArrayBuffer`s, including all Node.js Buffers. This is also included in the external value.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    heapTotal: meter.createObservableUpDownCounter('process.memory.heap.allocated', {
      description: 'Process Memory: Total heap size pre-allocated.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
    heapUsed: meter.createObservableUpDownCounter('process.memory.heap.used', {
      description: 'Process Memory: Used heap size.',
      unit: 'By',
      valueType: ValueType.INT,
    }),
  };

  meter.addBatchObservableCallback((result) => {
    v8.getHeapSpaceStatistics().forEach((space) => {
      const attributes = {
        'v8js.heap.space.name': space.space_name,
      };
      result.observe(memoryMetrics.limit, space.space_size, attributes);
      result.observe(memoryMetrics.used, space.space_used_size, attributes);
      result.observe(memoryMetrics.available, space.space_available_size, attributes);
      result.observe(memoryMetrics.physical, space.physical_space_size, attributes);
    });

    const memoryUsage = process.memoryUsage();
    result.observe(memoryMetrics.rss, memoryUsage.rss);
    result.observe(memoryMetrics.external, memoryUsage.external);
    result.observe(memoryMetrics.arrayBuffers, memoryUsage.arrayBuffers);
    result.observe(memoryMetrics.heapTotal, memoryUsage.heapTotal);
    result.observe(memoryMetrics.heapUsed, memoryUsage.heapUsed);
  }, Object.values(memoryMetrics));
}

function registerOtelEventLoopDelayMetrics(meter: Meter) {
  // Event Loop metrics as defined in https://opentelemetry.io/docs/specs/semconv/runtime/nodejs-metrics/
  const eventLoopDelayMetrics = {
    min: meter.createObservableGauge('nodejs.eventloop.delay.min', {
      description: 'Process Event Loop Delay: The minimum recorded event loop delay.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    max: meter.createObservableGauge('nodejs.eventloop.delay.max', {
      description: 'Process Event Loop Delay: The maximum recorded event loop delay.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    mean: meter.createObservableGauge('nodejs.eventloop.delay.mean', {
      description: 'Process Event Loop Delay: The mean recorded event loop delay.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    stddev: meter.createObservableGauge('nodejs.eventloop.delay.stddev', {
      description: 'Process Event Loop Delay: The standard deviation recorded event loop delay.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    exceeds: meter.createObservableGauge('nodejs.eventloop.delay.exceeds', {
      description:
        'Process Event Loop Delay: The number of times the event loop delay exceeded the maximum 1 hour event loop delay threshold.',
      unit: '1',
      valueType: ValueType.INT,
    }),
    p50: meter.createObservableGauge('nodejs.eventloop.delay.p50', {
      description:
        'Process Event Loop Delay: 50 percentile of delays of the collected data points.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    p75: meter.createObservableGauge('nodejs.eventloop.delay.p75', {
      description:
        'Process Event Loop Delay: 75 percentile of delays of the collected data points.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    p90: meter.createObservableGauge('nodejs.eventloop.delay.p90', {
      description:
        'Process Event Loop Delay: 90 percentile of delays of the collected data points.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    p95: meter.createObservableGauge('nodejs.eventloop.delay.p95', {
      description:
        'Process Event Loop Delay: 95 percentile of delays of the collected data points.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
    p99: meter.createObservableGauge('nodejs.eventloop.delay.p99', {
      description:
        'Process Event Loop Delay: 99 percentile of delays of the collected data points.',
      unit: 'ms', // The recommendation is seconds, but it provides very little resolution.
      valueType: ValueType.DOUBLE,
    }),
  };

  // Using a dedicated monitor for this because if we use the same monitor as the OpsMetrics' process collector,
  // it reports partial data points: i.e.: if OTel reports every 10s, but OpsMetrics triggers every 5s,
  // OTel misses out on the first 5s of the current tick.
  const eventLoopDelayMonitor = new EventLoopDelaysMonitor();

  meter.addBatchObservableCallback((result) => {
    const { percentiles, fromTimestamp, lastUpdatedAt, ...rest } = eventLoopDelayMonitor.collect();
    eventLoopDelayMonitor.reset();

    // Since we use a dedicated monitor, it's probably not necessary to report these dates.
    const attributes = {
      'nodejs.eventloop.delay.from': fromTimestamp,
      'nodejs.eventloop.delay.to': lastUpdatedAt,
    };
    Object.entries(rest).forEach(([key, value]) => {
      result.observe(
        eventLoopDelayMetrics[key as keyof typeof eventLoopDelayMetrics],
        value,
        attributes
      );
    });

    Object.entries(percentiles).forEach(([percentile, value]) => {
      result.observe(
        eventLoopDelayMetrics[`p${percentile}` as keyof typeof eventLoopDelayMetrics],
        value,
        attributes
      );
    });
  }, Object.values(eventLoopDelayMetrics));
}

function registerOtelEventLoopUtilizationMetrics(meter: Meter) {
  // Event Loop metrics as defined in https://opentelemetry.io/docs/specs/semconv/runtime/nodejs-metrics/
  const eventLoopUtilizationMetrics = {
    // https://opentelemetry.io/docs/specs/semconv/runtime/nodejs-metrics/#metric-nodejseventlooputilization
    utilization: meter.createObservableGauge('nodejs.eventloop.utilization', {
      description: 'Process Event Loop Utilization: The utilization of the event loop.',
      unit: '1',
      valueType: ValueType.DOUBLE,
    }),
    // https://opentelemetry.io/docs/specs/semconv/runtime/nodejs-metrics/#metric-nodejseventlooptime
    time: meter.createObservableCounter('nodejs.eventloop.time', {
      description:
        'Process Event Loop Utilization: Cumulative duration of time the event loop has been in each state.',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    }),
  };

  const eventLoopUtilizationMonitor = new EventLoopUtilizationMonitor();

  meter.addBatchObservableCallback((result) => {
    const { active, idle, utilization } = eventLoopUtilizationMonitor.collect();
    eventLoopUtilizationMonitor.reset();

    result.observe(eventLoopUtilizationMetrics.utilization, utilization);
    result.observe(eventLoopUtilizationMetrics.time, idle, { 'nodejs.eventloop.state': 'idle' });
    result.observe(eventLoopUtilizationMetrics.time, active, {
      'nodejs.eventloop.state': 'active',
    });
  }, Object.values(eventLoopUtilizationMetrics));
}
