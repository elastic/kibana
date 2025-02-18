/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';
import { OtelError } from './error';
import { OtelMetric } from './metric';
import { OtelTransaction } from './transaction';

interface OtelSharedResourceAttributes {
  'service.name'?: string;
  'agent.name'?: string;
  'agent.version'?: string;
  'metricset.interval'?: string;
  'service.instance.id'?: string;
  'telemetry.sdk.language'?: string;
  'telemetry.sdk.name'?: string;
  'telemetry.sdk.version'?: string;
  'some.resource.attribute'?: string;
}

export interface OtelDocument extends Fields {
  data_stream?: {
    dataset: string;
    namespace: string;
    type: string;
  };
  attributes?: {
    'timestamp.us'?: number;
    'metricset.name'?: string;
    [key: string]: any;
  };
  resource?: {
    attributes?: OtelSharedResourceAttributes;
    dropped_attributes_count?: number;
    schema_url?: string;
  };
  scope?: {
    attributes?: {
      'service.framework.name'?: string;
      'service.framework.version'?: string;
    };
    dropped_attributes_count?: number;
    name?: string;
  };
  name?: string;
  trace_id?: string;
  trace?: { id: string };
  span_id?: string;
  span?: { id: string };
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
  timestamp_us?: number;
}

class Otel extends Serializable<OtelDocument> {
  constructor(fields: OtelDocument) {
    super({
      ...fields,
    });
  }

  error(spanId: string) {
    return new OtelError({
      ...this.fields,
      attributes: {
        'exception.message': 'boom',
        'exception.handled': false,
        'exception.type': '*errors.errorString',
        'error.stack_trace': 'Error: INTERNAL: Boom',
        'processor.event': 'error',
        'timestamp.us': 1726580752010657,
        'event.name': 'exception',
        'error.id': `error-${spanId}`,
        'error.grouping_key': `errorGroup-${spanId}`,
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'logs',
      },
      'event.name': 'exception',
      dropped_attributes_count: 0,
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'service.name': 'sendotlp-synth',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
        },
        dropped_attributes_count: 0,
        schema_url: 'https://opentelemetry.io/schemas/1.26.0',
      },
      scope: {
        attributes: {
          'service.framework.name': 'sendotlp-synth',
          'service.framework.version': '',
        },
        dropped_attributes_count: 0,
        name: 'sendotlp-synth',
      },
      span_id: spanId,
    });
  }

  metric() {
    return new OtelMetric({
      ...this.fields,
      attributes: {
        'metricset.name': 'service_destination',
        'processor.event': 'metric',
        'event.outcome': 'success',
        'service.target.name': 'foo_service',
        'service.target.type': 'http',
        'span.name': 'child1',
        'span.destination.service.resource': 'foo_service:8080',
      },
      data_stream: {
        dataset: 'service_destination.10m.otel',
        namespace: 'default',
        type: 'metrics',
      },
      metrics: {
        service_summary: 2,
      },
      resource: {
        attributes: {
          'agent.name': 'otlp',
          'agent.version': '1.28.0',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'service.name': 'sendotlp-synth',
          'metricset.interval': '10m',
        },
        dropped_attributes_count: 0,
      },
      scope: {
        dropped_attributes_count: 0,
        name: 'github.com/elastic/opentelemetry-collector-components/connector/spanmetricsconnectorv2',
      },
    });
  }

  // In Otel we have only spans (https://opentelemetry.io/docs/concepts/signals/traces/#spans)
  // we call the root span a transaction to match our data model
  transaction(id: string) {
    return new OtelTransaction({
      ...this.fields,
      attributes: {
        'event.outcome': 'success',
        'event.success_count': 1,
        'processor.event': 'transaction',
        'timestamp.us': 1726580752010657,
        'transaction.duration.us': 15202,
        'transaction.id': id,
        'transaction.name': 'parent-synth',
        'transaction.representative_count': 1,
        'transaction.result': 'HTTP 2xx',
        'transaction.root': true,
        'transaction.sampled': true,
        'transaction.type': 'unknown',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'traces',
      },
      duration: 11742370,
      kind: 'Internal',
      name: 'parent-synth',
      resource: {
        attributes: {
          'agent.name': 'otlp',
          'agent.version': '1.28.0',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'service.name': 'sendotlp-synth',
        },
        dropped_attributes_count: 0,
        schema_url: 'https://opentelemetry.io/schemas/1.26.0',
      },
      scope: {
        attributes: {
          'service.framework.name': 'sendotlp-synth',
          'service.framework.version': '',
        },
        dropped_attributes_count: 0,
        name: 'sendotlp-synth',
      },
      span_id: id,
      status: {
        code: 'Unset',
      },
    });
  }
}

export function create(id: string): Otel {
  return new Otel({
    trace_id: id,
    dropped_attributes_count: 0,
    dropped_events_count: 0,
    dropped_links_count: 0,
  });
}

export const otel = {
  create,
};
