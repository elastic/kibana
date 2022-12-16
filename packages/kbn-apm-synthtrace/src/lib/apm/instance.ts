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
import { ApmApplicationMetricFields, ApmFields, SpanParams } from './apm_fields';

export class Instance extends Entity<ApmFields> {
  transaction(
    ...options:
      | [{ transactionName: string; transactionType?: string }]
      | [string]
      | [string, string]
  ) {
    let transactionName: string;
    let transactionType: string | undefined;
    if (options.length === 2) {
      transactionName = options[0];
      transactionType = options[1];
    } else if (typeof options[0] === 'string') {
      transactionName = options[0];
    } else {
      transactionName = options[0].transactionName;
      transactionType = options[0].transactionType;
    }

    return new Transaction({
      ...this.fields,
      'transaction.name': transactionName,
      'transaction.type': transactionType || 'request',
    });
  }

  span(...options: [string, string] | [string, string, string] | [SpanParams]) {
    let spanName: string;
    let spanType: string;
    let spanSubtype: string;
    let fields: ApmFields;

    if (options.length === 3 || options.length === 2) {
      spanName = options[0];
      spanType = options[1];
      spanSubtype = options[2] || 'unknown';
      fields = {};
    } else {
      ({ spanName, spanType, spanSubtype = 'unknown', ...fields } = options[0]);
    }

    return new Span({
      ...this.fields,
      ...fields,
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
