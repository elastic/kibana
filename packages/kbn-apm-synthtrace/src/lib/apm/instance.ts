/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmError } from './apm_error';
import { Entity } from '../entity';
import { Metricset } from './metricset';
import { Span } from './span';
import { Transaction } from './transaction';
import { ApmApplicationMetricFields, ApmFields } from './apm_fields';
import url from 'url';

export class Instance extends Entity<ApmFields> {
  transaction(transactionName: string, transactionType = 'request') {
    return new Transaction({
      ...this.fields,
      'transaction.name': transactionName,
      'transaction.type': transactionType,
    });
  }

  dbExitSpan({ spanName, subType }: { spanName: string; subType?: string }) {
    const exitSpan = new Span({
      ...this.fields,
      'service.target.type': subType,
      'span.destination.service.name': '', //deprecated
      'span.destination.service.resource': subType,
      'span.destination.service.type': '', //deprecated
      'span.name': spanName,
      'span.subtype': subType,
      'span.type': 'db',
    });

    return exitSpan;
  }

  messagingExitSpan(mesageQueueName: string) {}

  httpExitSpan({ spanName, destination }: { spanName: string; destination: string }) {
    // host: 'opbeans-go:3000',
    // hostname: 'opbeans-go',
    // port: '3000',
    const parsed = new url.URL(destination);

    const exitSpan = new Span({
      ...this.fields,
      'destination.address': parsed.hostname,
      'destination.port': parseInt(parsed.port, 10),
      'service.target.name': parsed.host,
      'span.destination.service.name': '', //deprecated
      'span.destination.service.resource': parsed.host,
      'span.destination.service.type': '', //deprecated
      'span.name': spanName,
      'span.subtype': 'http',
      'span.type': 'external',
    });

    return exitSpan;
  }

  span(spanName: string, spanType: string, spanSubtype?: string) {
    return new Span({
      ...this.fields,
      'span.name': spanName,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    });
  }

  error(message: string, type?: string, groupingName?: string) {
    return new ApmError({
      ...this.fields,
      'error.exception': [{ message, ...(type ? { type } : {}) }],
      'error.grouping_name': groupingName || message,
    });
  }

  containerId(containerId: string) {
    this.fields['container.id'] = containerId;
    return this;
  }

  podId(podId: string) {
    this.fields['kubernetes.pod.uid'] = podId;
    return this;
  }

  appMetrics(metrics: ApmApplicationMetricFields) {
    return new Metricset<ApmFields>({
      ...this.fields,
      'metricset.name': 'app',
      ...metrics,
    });
  }
}
