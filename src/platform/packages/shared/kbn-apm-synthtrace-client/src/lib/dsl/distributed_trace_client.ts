/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { times } from 'lodash';
import { elasticsearchSpan, httpExitSpan, HttpMethod, redisSpan, sqliteSpan } from '../apm/span';
import { BaseSpan } from '../apm/base_span';
import { Instance } from '../apm/instance';
import { Transaction } from '../apm/transaction';
import { SpanParams } from '../apm/apm_fields';

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
    repeat = 1,
    timestamp = this.timestamp,
    duration,
    children,
  }: {
    serviceInstance: Instance;
    transactionName: string;
    repeat?: number;
    timestamp?: number;
    latency?: number;
    duration?: number;
    children?: (dt: DistributedTrace) => unknown;
  }) {
    const originServiceInstance = this.serviceInstance;

    times(repeat, () => {
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
    });
  }

  external({
    name,
    url,
    method,
    statusCode,
    duration,
    timestamp = this.timestamp,
  }: {
    name: string;
    url: string;
    method?: HttpMethod;
    statusCode?: number;
    duration: number;
    timestamp?: number;
  }) {
    const startTime = timestamp;
    const endTime = startTime + duration;
    this.spanEndTimes.push(endTime);

    const span = this.serviceInstance
      .span(httpExitSpan({ spanName: name, destinationUrl: url, method, statusCode }))
      .timestamp(startTime)
      .duration(duration)
      .success();

    this.childSpans.push(span);
  }

  db({
    name,
    duration,
    type,
    statement,
    timestamp = this.timestamp,
  }: {
    name: string;
    duration: number;
    type: 'elasticsearch' | 'sqlite' | 'redis';
    statement?: string;
    timestamp?: number;
  }) {
    const startTime = timestamp;
    const endTime = startTime + duration;
    this.spanEndTimes.push(endTime);

    let dbSpan: SpanParams;
    switch (type) {
      case 'elasticsearch':
        dbSpan = elasticsearchSpan(name, statement);
        break;

      case 'sqlite':
        dbSpan = sqliteSpan(name, statement);
        break;

      case 'redis':
        dbSpan = redisSpan(name);
        break;
    }

    const span = this.serviceInstance
      .span(dbSpan)
      .timestamp(startTime)
      .duration(duration)
      .success();

    this.childSpans.push(span);
  }
}
