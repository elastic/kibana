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

export type SpanParams = {
  spanName: string;
  spanType: string;
  spanSubtype?: string;
} & ApmFields;

export class Instance extends Entity<ApmFields> {
  transaction({
    transactionName,
    transactionType = 'request',
  }: {
    transactionName: string;
    transactionType?: string;
  }) {
    return new Transaction({
      ...this.fields,
      'transaction.name': transactionName,
      'transaction.type': transactionType,
    });
  }

  span({ spanName, spanType, spanSubtype, ...apmFields }: SpanParams) {
    return new Span({
      ...this.fields,
      ...apmFields,
      'span.name': spanName,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    });
  }

  error({
    message,
    type,
    groupingName,
  }: {
    message: string;
    type?: string;
    groupingName?: string;
  }) {
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
