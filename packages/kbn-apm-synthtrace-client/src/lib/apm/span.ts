/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseSpan } from './base_span';
import { generateShortId } from '../utils/generate_id';
import { ApmFields, SpanParams } from './apm_fields';

export class Span extends BaseSpan {
  constructor(fields: ApmFields) {
    super({
      ...fields,
      'processor.event': 'span',
      'span.id': generateShortId(),
    });
  }

  duration(duration: number) {
    this.fields['span.duration.us'] = duration * 1000;
    return this;
  }

  destination(resource: string) {
    this.fields['span.destination.service.resource'] = resource;

    return this;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT';

export function httpExitSpan({
  spanName,
  destinationUrl,
  method = 'GET',
  statusCode = 200,
}: {
  spanName: string;
  destinationUrl: string;
  method?: HttpMethod;
  statusCode?: number;
}): SpanParams {
  // origin: 'http://opbeans-go:3000',
  // host: 'opbeans-go:3000',
  // hostname: 'opbeans-go',
  // port: '3000',
  const destination = new URL(destinationUrl);

  const spanType = 'external';
  const spanSubtype = 'http';

  return {
    spanName,
    spanType,
    spanSubtype,

    // http
    'span.action': method,
    'http.request.method': method,
    'http.response.status_code': statusCode,

    // destination
    'destination.address': destination.hostname,
    'destination.port': parseInt(destination.port, 10),
    'service.target.name': destination.host,
    'span.destination.service.resource': destination.host,
  };
}

export function dbExitSpan({ spanName, spanSubtype }: { spanName: string; spanSubtype?: string }) {
  const spanType = 'db';

  return {
    spanName,
    spanType,
    spanSubtype,
    'service.target.type': spanSubtype,
    'span.destination.service.resource': spanSubtype,
  };
}

export function elasticsearchSpan(spanName: string, statement?: string): SpanParams {
  const spanType = 'db';
  const spanSubtype = 'elasticsearch';

  return {
    spanName,
    spanType,
    spanSubtype,

    ...(statement
      ? {
          'span.db.statement': statement,
          'span.db.type': 'elasticsearch',
        }
      : {}),

    'service.target.type': spanSubtype,
    'destination.address': 'qwerty.us-west2.gcp.elastic-cloud.com',
    'destination.port': 443,
    'span.destination.service.resource': spanSubtype,
  };
}

export function sqliteSpan(spanName: string, statement?: string): SpanParams {
  const spanType = 'db';
  const spanSubtype = 'sqlite';

  return {
    spanName,
    spanType,
    spanSubtype,

    ...(statement
      ? {
          'span.db.statement': statement,
          'span.db.type': 'sql',
        }
      : {}),

    // destination
    'service.target.type': spanSubtype,
    'destination.address': 'qwerty.us-west2.gcp.elastic-cloud.com',
    'destination.port': 443,
    'span.destination.service.resource': spanSubtype,
  };
}

export function redisSpan(spanName: string): SpanParams {
  const spanType = 'db';
  const spanSubtype = 'redis';

  return {
    spanName,
    spanType,
    spanSubtype,

    // destination
    'service.target.type': spanSubtype,
    'destination.address': 'qwerty.us-west2.gcp.elastic-cloud.com',
    'destination.port': 443,
    'span.destination.service.resource': spanSubtype,
  };
}
