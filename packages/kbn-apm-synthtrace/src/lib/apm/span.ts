/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import { BaseSpan } from './base_span';
import { generateShortId } from '../utils/generate_id';
import { ApmFields } from './apm_fields';

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

  destination(resource: string, type?: string, name?: string) {
    if (!type) {
      type = this.fields['span.type'];
    }

    if (!name) {
      name = resource;
    }
    this.fields['span.destination.service.resource'] = resource;
    this.fields['span.destination.service.name'] = name;
    this.fields['span.destination.service.type'] = type;

    return this;
  }
}

export function httpExitSpan({
  spanName,
  destinationUrl,
}: {
  spanName: string;
  destinationUrl: string;
}) {
  // origin: 'http://opbeans-go:3000',
  // host: 'opbeans-go:3000',
  // hostname: 'opbeans-go',
  // port: '3000',
  const destination = new url.URL(destinationUrl);

  const spanType = 'external';
  const spanSubType = 'http';

  return {
    spanName,
    spanType,
    spanSubType,
    'destination.address': destination.hostname,
    'destination.port': parseInt(destination.port, 10),
    'service.target.name': destination.host,
    'span.destination.service.name': destination.origin,
    'span.destination.service.resource': destination.host,
    'span.destination.service.type': 'external',
  };
}

export function dbExitSpan({ spanName, spanSubType }: { spanName: string; spanSubType?: string }) {
  const spanType = 'db';

  return {
    spanName,
    spanType,
    spanSubType,
    'service.target.type': spanSubType,
    'span.destination.service.name': spanSubType,
    'span.destination.service.resource': spanSubType,
    'span.destination.service.type': spanType,
  };
}
