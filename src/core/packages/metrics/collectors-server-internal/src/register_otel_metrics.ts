/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Meter, metrics, ValueType } from '@opentelemetry/api';
import { EventLoopUtilizationMonitor } from './event_loop_utilization_monitor';
import { EventLoopDelaysMonitor } from './event_loop_delays_monitor';

export function registerOtelMetrics() {
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
    utilization: meter.createObservableGauge('nodejs.eventloop.utilization', {
      description: 'Process Event Loop Utilization: The utilization of the event loop.',
      unit: '1',
      valueType: ValueType.DOUBLE,
    }),
    time: meter.createObservableGauge('nodejs.eventloop.time', {
      description:
        'Process Event Loop Utilization: Cumulative duration of time the event loop has been in each state.',
      unit: '1',
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
