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

type LatencyState = {
  count: number;
  min: number;
  max: number;
  sum: number;
  timestamp: number;
} & Pick<ApmFields, 'service.name' | 'service.environment' | 'transaction.type'>;

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
    | 'transaction.type'
  > &
  Partial<{
    'transaction.duration.aggregate': {
      min: number;
      max: number;
      sum: number;
      value_count: number;
    };
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
        transaction: {
          type: 'object',
          properties: {
            type: { type: 'keyword', time_series_dimension: true },
            duration: {
              type: 'object',
              properties: {
                aggregate: {
                  type: 'aggregate_metric_double',
                  metrics: ['min', 'max', 'sum', 'value_count'],
                  default_metric: 'sum',
                  time_series_metric: 'gauge',
                },
              },
            },
          },
        },
        service: {
          type: 'object',
          properties: {
            name: { type: 'keyword', time_series_dimension: true },
            environment: { type: 'keyword', time_series_dimension: true },
          },
        },
      },
    };
  }

  getDimensions(): string[] {
    return ['service.name', 'service.environment', 'transaction.type'];
  }

  getWriteTarget(document: Record<string, any>): string | null {
    const eventType = document.metricset?.name;
    if (eventType === 'service') return 'metrics-apm.service-default';
    return null;
  }

  private state: Record<string, LatencyState> = {};

  private processedComponent: number = 0;

  process(event: ApmFields): Fields[] | null {
    if (!event['@timestamp']) return null;
    const service = event['service.name']!;
    const environment = event['service.environment'] ?? 'production';
    const transactionType = event['transaction.type'] ?? 'request';
    const key = `${service}-${environment}-${transactionType}`;
    const addToState = (timestamp: number) => {
      if (!this.state[key]) {
        this.state[key] = {
          timestamp,
          count: 0,
          min: 0,
          max: 0,
          sum: 0,
          'service.name': service,
          'service.environment': environment,
          'transaction.type': transactionType,
        };
      }
      const duration = Number(event['transaction.duration.us']);
      if (duration >= 0) {
        const state = this.state[key];

        state.count++;
        state.sum += duration;
        if (duration > state.max) state.max = duration;
        if (duration < state.min) state.min = Math.min(0, duration);
      }
    };

    // ensure we flush current state first if event falls out of the current max window age
    if (this.state[key]) {
      const diff = Math.abs(event['@timestamp'] - this.state[key].timestamp);
      if (diff >= 1000 * 60) {
        const fields = this.createServiceFields(key);
        delete this.state[key];
        addToState(event['@timestamp']);
        return [fields];
      }
    }

    addToState(event['@timestamp']);
    // if cardinality is too high force emit of current state
    if (Object.keys(this.state).length === 1000) {
      return this.flush();
    }

    return null;
  }

  flush(): Fields[] {
    const fields = Object.keys(this.state).map((key) => this.createServiceFields(key));
    this.state = {};
    return fields;
  }

  private createServiceFields(key: string): ServiceFields {
    this.processedComponent = ++this.processedComponent % 1000;
    const component = Date.now() % 100;
    const state = this.state[key];
    return {
      '@timestamp': state.timestamp + random(0, 100) + component + this.processedComponent,
      'metricset.name': 'service',
      'processor.event': 'metric',
      'service.name': state['service.name'],
      'service.environment': state['service.environment'],
      'transaction.type': state['transaction.type'],
      'transaction.duration.aggregate': {
        min: state.min,
        max: state.max,
        sum: state.sum,
        value_count: state.count,
      },
    };
  }

  async bootstrapElasticsearch(esClient: Client): Promise<void> {}
}
