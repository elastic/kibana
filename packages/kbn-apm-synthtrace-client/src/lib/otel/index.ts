/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Serializable } from '../serializable';
import { OtelError } from './error';
import { OtelMetric } from './metric';
import { OtelTransaction } from './transaction';

export interface OtelTrace {
  attributes?: {
    'event.outcome'?: string;
    'event.success_count'?: number;
    'processor.event'?: string;
    'timestamp.us'?: number;
    'transaction.duration.us'?: number;
    'transaction.id'?: string;
    'transaction.name'?: string;
    'transaction.representative_count'?: number;
    'transaction.result'?: string;
    'transaction.root'?: boolean;
    'transaction.sampled'?: boolean;
    'transaction.type'?: string;
    // error
    'exception.message'?: string;
    'exception.type'?: string;
    // metrics
    'metricset.interval'?: string;
    'metricset.name'?: string;
  };
  data_stream?: {
    dataset: string;
    namespace: string;
    type: string;
  };
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
  duration?: number;
  kind?: string;
  name?: string;
  resource?: {
    attributes?: {
      'agent.name'?: string;
      'agent.version'?: string;
      'service.name'?: string;
      'some.resource.attribute'?: string;
      'telemetry.sdk.language'?: string;
      'telemetry.sdk.name'?: string;
      'telemetry.sdk.version'?: string;
      // metrics
      'metricset.interval'?: string;
    };
    dropped_attributes_count?: number;
    schema_url?: string;
  };
  scope?: {
    attributes?: {
      'service.framework.name': string;
      'service.framework.version': string;
    };
    dropped_attributes_count?: number;
    name?: string;
  };
  span_id?: string;
  status?: {
    code: string;
  };
  trace_id: string;
  '@timestamp'?: number | undefined;
  'timestamp.us'?: number | undefined;
  // metrics
  metrics?: {
    service_summary?: number;
  };
}

export type OtelDocument = OtelTrace;

class Otel extends Serializable<OtelDocument> {
  constructor(fields: OtelDocument) {
    super({
      ...fields,
    });
  }

  timestamp(time: number) {
    super.timestamp(time);
    return this;
  }

  error(id: string) {
    return new OtelError({
      ...this.fields,
      attributes: {
        'exception.message': 'boom',
        'exception.type': '*errors.errorString',
        'processor.event': 'error',
        'timestamp.us': 1725633628036123,
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'logs',
      },
      dropped_attributes_count: 0,
      name: 'exception',
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
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
      span_id: '96d91c11a4e393fb',
      trace_id: id,
    });
  }

  metric(id: string) {
    return new OtelMetric({
      ...this.fields,
      attributes: {
        'metricset.interval': '1m',
        'metricset.name': 'service_summary',
        'processor.event': 'metric',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'metrics',
      },
      metrics: {
        service_summary: 2,
      },
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'metricset.interval': '1m',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
        },
        dropped_attributes_count: 0,
      },
      scope: {
        dropped_attributes_count: 0,
        name: 'github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector',
      },
      trace_id: id,
    });
  }
  transaction(id: string) {
    return new OtelTransaction({
      ...this.fields,
      attributes: {
        'event.outcome': 'success',
        'event.success_count': 1,
        'processor.event': 'transaction',
        'timestamp.us': 1725464233071114,
        'transaction.duration.us': 15202,
        'transaction.id': 'da907d6b5267c8f6',
        'transaction.name': 'parent-synth',
        'transaction.representative_count': 1,
        'transaction.result': 'Success',
        'transaction.root': true,
        'transaction.sampled': true,
        'transaction.type': 'unknown',
      },
      dropped_attributes_count: 0,
      dropped_events_count: 0,
      dropped_links_count: 0,
      duration: 15202584,
      kind: 'Internal',
      name: 'parent-synth',
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
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
      span_id: `${id}-da907d6b5267c8fa`,
      status: {
        code: 'Unset',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'traces',
      },
      trace_id: id,
    });
  }
}

export function create(): Otel {
  return new Otel();
}

export const otel = {
  create,
};
