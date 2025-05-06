/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Span } from './span';
import { Transaction } from './transaction';
import { ApmOtelFields, OtelSpanParams } from './apm_otel_fields';
import { ApmOtelError } from './apm_otel_error';
import { Entity } from '../../entity';

export class OtelInstance extends Entity<ApmOtelFields> {
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
      'attributes.transaction.name': transactionName,
      'attributes.transaction.type': transactionType || 'request',
    });
  }

  span(...options: [string, string] | [string, string, string] | [OtelSpanParams]) {
    let spanName: string;
    let spanType: string | undefined;
    let spanSubtype: string | undefined;
    let spanKind: string | undefined;
    let fields: ApmOtelFields;

    if (options.length === 3 || options.length === 2) {
      // When two or three arguments are passed
      spanName = options[0];
      spanType = options[1];
      spanSubtype = options[2] || 'unknown'; // Default to 'unknown' if no third argument
      fields = {};
    } else {
      ({ spanName, spanType, spanSubtype = 'unknown', ...fields } = options[0]);
    }

    return new Span({
      ...this.fields,
      ...fields,
      'attributes.span.name': spanName,
      'attributes.span.type': spanType,
      'attributes.span.kind': spanKind,
      'attributes.span.subtype': spanSubtype,
    });
  }
  error({
    message,
    type,
    stackTrace,
    groupingKey,
  }: {
    message: string;
    type?: string;
    stackTrace?: string;
    groupingKey?: string;
  }) {
    return new ApmOtelError({
      ...this.fields,
      ...(groupingKey ? { 'attributes.error.grouping_key': groupingKey } : {}),
      'attributes.exception.type': type,
      'attributes.exception.message': message,
      'attributes.error.stack_trace': stackTrace,
    });
  }

  hostName(hostName: string) {
    this.fields['resource.attributes.host.name'] = hostName;
    return this;
  }
}
