/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';
import { OtelError } from './error';
import { OtelMetric } from './metric';
import { OtelTransaction } from './transaction';

export interface SharedAttributes {
  'service.name'?: string;
  'agent.name'?: string;
  'agent.version'?: string;
  'metricset.interval'?: string;
  'service.instance.id'?: string;
  'telemetry.sdk.language'?: string;
  'telemetry.sdk.name'?: string;
  'telemetry.sdk.version'?: string;
  'some.resource.attribute'?: string;
  'timestamp.us'?: number;
}

export interface OtelDocument extends Fields {
  data_stream?: {
    dataset: string;
    namespace: string;
    type: string;
  };
  attributes?: {
    [key: string]: any;
  };
  resource?: {
    attributes?: SharedAttributes;
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
  span_id?: string;
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
}

class Otel extends Serializable<OtelDocument> {
  constructor(fields: OtelDocument) {
    super({
      ...fields,
    });
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
    });
  }

  metric() {
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
          'agent.name': 'otlp',
          'agent.version': 'unknown',
          'metricset.interval': '1m',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
        },
        dropped_attributes_count: 0,
      },
      scope: {
        dropped_attributes_count: 0,
        name: 'github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector',
      },
    });
  }

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
        'transaction.result': 'Success',
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
          'some.resource.attribute': 'resource.attr',
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
