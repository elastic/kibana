/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchSpan, httpExitSpan } from '../../lib/apm/span';
import { BaseSpan } from '../../lib/apm/base_span';
import { Instance } from '../../lib/apm/instance';
import { Transaction } from '../../lib/apm/transaction';

export class DistributedTrace {
  timestamp: number;
  serviceInstance: Instance;
  spanEndTimes: number[] = [];
  childSpans: BaseSpan[] = [];
  transaction: Transaction;

  constructor({
    serviceInstance,
    transactionName,
    timestamp,
    children,
  }: {
    serviceInstance: Instance;
    transactionName: string;
    timestamp: number;
    children?: (dt: DistributedTrace) => void;
  }) {
    this.timestamp = timestamp;
    this.serviceInstance = serviceInstance;

    if (children) {
      children(this);
    }

    const maxEndTime = Math.max(...this.spanEndTimes);
    const duration = maxEndTime - this.timestamp;

    this.transaction = serviceInstance
      .transaction({ transactionName })
      .timestamp(timestamp)
      .duration(duration)
      .children(...this.childSpans);

    return this;
  }

  getTransaction() {
    return this.transaction;
  }

  service({
    serviceInstance,
    transactionName,
    latency = 0,
    timestamp = this.timestamp,
    duration,
    children,
  }: {
    serviceInstance: Instance;
    transactionName: string;
    timestamp?: number;
    latency?: number;
    duration?: number;
    children?: (dt: DistributedTrace) => unknown;
  }) {
    const originServiceInstance = this.serviceInstance;
    const dt = new DistributedTrace({
      serviceInstance,
      transactionName,
      timestamp: timestamp + latency / 2,
      children,
    });

    const maxSpanEndTime = Math.max(...dt.spanEndTimes, timestamp + (duration ?? 0));
    this.spanEndTimes.push(maxSpanEndTime + latency / 2);

    // origin service
    const exitSpanStart = timestamp;
    const exitSpanDuration = (duration ?? maxSpanEndTime - exitSpanStart) + latency / 2;

    // destination service
    const transactionStart = timestamp + latency / 2;
    const transactionDuration = duration ?? maxSpanEndTime - transactionStart;

    const span = originServiceInstance
      .span(
        httpExitSpan({
          spanName: transactionName,
          destinationUrl: 'http://api-gateway:3000', // TODO: this should be derived from serviceInstance
        })
      )
      .duration(exitSpanDuration)
      .timestamp(exitSpanStart)
      .children(
        dt.serviceInstance
          .transaction({ transactionName })
          .timestamp(transactionStart)
          .duration(transactionDuration)
          .children(...(dt.childSpans ?? []))
      );

    this.childSpans.push(span);
  }

  db({
    duration,
    type, // TODO: implement handling of db type, eg. 'elasticsearch', 'sql' etc
    dbStatement,
    timestamp = this.timestamp,
    latency = 0,
  }: {
    duration: number;
    type: 'elasticsearch';
    dbStatement?: string;
    timestamp?: number;
    latency?: number;
  }) {
    const startTime = timestamp + latency / 2;
    const endTime = startTime + duration + latency / 2;
    this.spanEndTimes.push(endTime);

    const span = this.serviceInstance
      .span(elasticsearchSpan('GET apm-*/_search', dbStatement))
      .timestamp(startTime)
      .duration(duration)
      .success();

    this.childSpans.push(span);
  }
}
