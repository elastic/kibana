/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, ApmUserAgentFields } from './apm_fields';
import { Entity } from '../entity';
import { RumSpan } from './rum_span';
import { RumTransaction } from './rum_transaction';

export class Browser extends Entity<ApmFields> {
  transaction(transactionName: string, transactionType: string = 'page-load') {
    return new RumTransaction({
      ...this.fields,
      'transaction.name': transactionName,
      'transaction.type': transactionType,
    });
  }

  span(spanName: string, spanType: string, spanSubtype: string) {
    return new RumSpan({
      ...this.fields,
      'span.name': spanName,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    });
  }
}

export function browser(serviceName: string, production: string, userAgent: ApmUserAgentFields) {
  return new Browser({
    'agent.name': 'rum-js',
    'service.name': serviceName,
    'service.environment': production,
    ...userAgent,
  });
}
