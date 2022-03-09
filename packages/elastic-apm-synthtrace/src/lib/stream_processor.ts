/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ApmFields } from './apm/apm_fields';
import { SpanIterable } from './span_iterable';
import { getTransactionMetrics } from './apm/processors/get_transaction_metrics';
import { getSpanDestinationMetrics } from './apm/processors/get_span_destination_metrics';
import { getBreakdownMetrics } from './apm/processors/get_breakdown_metrics';
import { parseInterval } from './interval';
import { dedot } from './utils/dedot';
import { ApmElasticsearchOutputWriteTargets } from './apm/utils/get_apm_write_targets';
import { Logger } from './utils/create_logger';

export interface StreamProcessorOptions {
  processors: Array<(events: ApmFields[]) => ApmFields[]>;
  flushInterval?: string;
  maxBufferSize?: number;
  // the maximum source events to process, not the maximum documents outputted by the processor
  maxSourceEvents?: number;
  logger?: Logger;
}

export class StreamProcessor {
  public static readonly apmProcessors = [
    getTransactionMetrics,
    getSpanDestinationMetrics,
    getBreakdownMetrics,
  ];

  constructor(private readonly options: StreamProcessorOptions) {
    [this.intervalAmount, this.intervalUnit] = this.options.flushInterval
      ? parseInterval(this.options.flushInterval)
      : parseInterval('1m');
  }
  private readonly intervalAmount: number;
  private readonly intervalUnit: any;

  // TODO move away from chunking and feed this data one by one to processors
  *stream(...eventSources: SpanIterable[]) {
    const maxBufferSize = this.options.maxBufferSize ?? 10000;
    const maxSourceEvents = this.options.maxSourceEvents;
    let localBuffer = [];
    let flushAfter: number | null = null;
    let sourceEventsYielded = 0;
    for (const eventSource of eventSources) {
      const order = eventSource.order();
      this.options.logger?.info(`order: ${order}`);
      for (const event of eventSource) {
        const eventDate = event['@timestamp'] as number;
        localBuffer.push(event);
        if (flushAfter === null && eventDate !== null) {
          flushAfter = this.calculateFlushAfter(eventDate, order);
        }

        yield StreamProcessor.enrich(event);
        sourceEventsYielded++;
        if (maxSourceEvents && sourceEventsYielded % (maxSourceEvents / 10) === 0) {
          this.options.logger?.info(`Yielded ${sourceEventsYielded} events`);
        }
        if (maxSourceEvents && sourceEventsYielded >= maxSourceEvents) {
          // yielded the maximum source events, we still want the local buffer to generate derivative documents
          break;
        }
        if (
          localBuffer.length === maxBufferSize ||
          (flushAfter != null &&
            ((order === 'asc' && eventDate > flushAfter) ||
              (order === 'desc' && eventDate < flushAfter)))
        ) {
          const e = new Date(eventDate).toISOString();
          const f = new Date(flushAfter!).toISOString();
          this.options.logger?.debug(
            `flush ${localBuffer.length} documents ${order}: ${e} => ${f}`
          );
          for (const processor of this.options.processors) {
            yield* processor(localBuffer).map(StreamProcessor.enrich);
          }
          localBuffer = [];
          flushAfter = this.calculateFlushAfter(flushAfter, order);
        }
      }
      if (maxSourceEvents && sourceEventsYielded >= maxSourceEvents) {
        this.options.logger?.info(`Yielded maximum number of documents: ${maxSourceEvents}`);
        break;
      }
    }
    if (localBuffer.length > 0) {
      this.options.logger?.info(`Processing remaining buffer: ${localBuffer.length} items left`);
      for (const processor of this.options.processors) {
        yield* processor(localBuffer).map(StreamProcessor.enrich);
      }
    }
  }

  private calculateFlushAfter(eventDate: number | null, order: 'asc' | 'desc') {
    if (order === 'desc') {
      return moment(eventDate).subtract(this.intervalAmount, this.intervalUnit).valueOf();
    } else {
      return moment(eventDate).add(this.intervalAmount, this.intervalUnit).valueOf();
    }
  }

  async *streamAsync(...eventSources: SpanIterable[]): AsyncIterator<ApmFields> {
    yield* this.stream(...eventSources);
  }
  *streamToDocument<TDocument>(
    map: (d: ApmFields) => TDocument,
    ...eventSources: SpanIterable[]
  ): Generator<ApmFields> {
    for (const apmFields of this.stream(...eventSources)) {
      yield map(apmFields);
    }
  }
  async *streamToDocumentAsync<TDocument>(
    map: (d: ApmFields) => TDocument,
    ...eventSources: SpanIterable[]
  ): AsyncIterator<ApmFields> {
    for (const apmFields of this.stream(...eventSources)) {
      yield map(apmFields);
    }
  }
  streamToArray(...eventSources: SpanIterable[]) {
    return Array.from<ApmFields>(this.stream(...eventSources));
  }

  static enrich(document: ApmFields): ApmFields {
    // see https://github.com/elastic/apm-server/issues/7088 can not be provided as flat key/values
    document.observer = {
      version: '8.0.0',
      version_major: 8,
    };
    document['service.node.name'] =
      document['service.node.name'] || document['container.id'] || document['host.name'];
    document['ecs.version'] = '1.4';
    // TODO this non standard field should not be enriched here
    if (document['processor.event'] !== 'metric') {
      document['timestamp.us'] = document['@timestamp']! * 1000;
    }
    return document;
  }

  static toDocument(document: ApmFields): Record<string, any> {
    if (!document.observer) {
      document = StreamProcessor.enrich(document);
    }
    const newDoc: Record<string, any> = {};
    dedot(document, newDoc);
    if (typeof newDoc['@timestamp'] === 'number') {
      const timestamp = newDoc['@timestamp'];
      newDoc['@timestamp'] = new Date(timestamp).toISOString();
    }
    return newDoc;
  }

  static getDataStreamForEvent(
    d: Record<string, any>,
    writeTargets: ApmElasticsearchOutputWriteTargets
  ) {
    if (!d.processor?.event) {
      throw Error("'processor.event' is not set on document, can not determine target index");
    }
    const eventType = d.processor.event as keyof ApmElasticsearchOutputWriteTargets;
    let dataStream = writeTargets[eventType];
    if (eventType === 'metric') {
      if (!d.service?.name) {
        dataStream = 'metrics-apm.app-default';
      } else {
        if (!d.transaction && !d.span) {
          dataStream = 'metrics-apm.app-default';
        }
      }
    }
    return dataStream;
  }

  static getIndexForEvent(
    d: Record<string, any>,
    writeTargets: ApmElasticsearchOutputWriteTargets
  ) {
    if (!d.processor?.event) {
      throw Error("'processor.event' is not set on document, can not determine target index");
    }

    const eventType = d.processor.event as keyof ApmElasticsearchOutputWriteTargets;
    return writeTargets[eventType];
  }
}

export async function* streamProcessAsync(
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  ...eventSources: SpanIterable[]
) {
  return new StreamProcessor({ processors }).streamAsync(...eventSources);
}

export function streamProcessToArray(
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  ...eventSources: SpanIterable[]
) {
  return new StreamProcessor({ processors }).streamToArray(...eventSources);
}
