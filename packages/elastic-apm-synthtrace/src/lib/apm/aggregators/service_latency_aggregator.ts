/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { random } from 'lodash';
import { Client } from '@elastic/elasticsearch';
import { ApmFields } from '../apm_fields';
import { Fields } from '../../entity';
import { StreamAggregator } from '../../stream_aggregator';

interface LatencyState {
  count: number;
  min: number;
  max: number;
  sum: number;
  timestamp: number;
}

export type ServiceFields = Fields &
  Pick<
    ApmFields,
    | 'timestamp.us'
    | 'ecs.version'
    | 'metricset.name'
    | 'observer'
    | 'processor.event'
    | 'processor.name'
    | 'service.name'
    | 'service.version'
    | 'service.environment'
  > &
  Partial<{
    'service.latency': { min: number; max: number; sum: number; value_count: number };
  }>;

export class ServiceLatencyAggregator implements StreamAggregator<ApmFields> {
  public readonly name;

  constructor() {
    this.name = 'service-latency';
  }

  getDataStreamName(): string {
    return 'metrics-apm.service';
  }

  getMappings(): Record<string, any> {
    return {
      properties: {
        '@timestamp': {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        service: {
          type: 'object',
          properties: {
            name: {
              type: 'keyword',
              time_series_dimension: true,
            },
            latency: {
              type: 'aggregate_metric_double',
              metrics: ['min', 'max', 'sum', 'value_count'],
              default_metric: 'sum',
              time_series_metric: 'gauge',
            },
          },
        },
      },
    };
  }

  getDimensions(): string[] {
    return ['service.name'];
  }

  getWriteTarget(document: Record<string, any>): string | null {
    if (!document.processor?.event) {
      throw Error("'processor.event' is not set on document, can not determine target index");
    }
    const eventType = document.processor.event;
    if (eventType === 'service') return 'metrics-apm.service-default';
    return null;
  }

  private state: Record<string, LatencyState> = {};

  private processedComponent: number = 0;

  process(event: ApmFields): Fields[] | null {
    if (event['processor.event'] !== 'transaction') return null;
    if (!event['@timestamp']) return null;

    const service = event['service.name']!;
    if (!this.state[service]) {
      this.state[service] = {
        count: 0,
        min: 0,
        max: 0,
        sum: 0,
        timestamp: event['@timestamp'],
      };
    }
    const duration = Number(event['transaction.duration.us']);
    const state = this.state[service];

    state.count++;
    state.sum += duration;
    if (duration > state.max) state.max = duration;
    if (duration < state.min) state.min = Math.min(0, duration);

    if (Object.keys(this.state).length === 1000) {
      return this.createFieldsFromState();
    }

    const diff = Math.abs(event['@timestamp'] - this.state[service].timestamp);
    if (diff >= 1000 * 60) {
      const fields = this.createServiceFields(service);
      delete this.state[service];
      return [fields];
    }
    return null;
  }

  flush(): Fields[] {
    return this.createFieldsFromState();
  }

  private createFieldsFromState(): ServiceFields[] {
    const fields = Object.keys(this.state).map((service) => this.createServiceFields(service));
    this.state = {};
    return fields;
  }

  private createServiceFields(service: string): ServiceFields {
    this.processedComponent = ++this.processedComponent % 1000;
    const component = Date.now() % 100;
    return {
      '@timestamp':
        this.state[service].timestamp + random(0, 100) + component + this.processedComponent,
      'metricset.name': 'service',
      'processor.event': 'service',
      'service.name': service,
      'service.latency': {
        min: this.state[service].min,
        max: this.state[service].max,
        sum: this.state[service].sum,
        value_count: this.state[service].count,
      },
    };
  }

  async bootstrapElasticsearch(esClient: Client): Promise<void> {}
}
