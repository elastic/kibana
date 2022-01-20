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

export interface StreamProcessorOptions {
  processors: Array<(events: ApmFields[]) => ApmFields[]>;
  flushInterval?: string;
  maxBufferSize?: number;
  // the maximum source events to process, not the maximum documents outputted by the processor
  maxSourceEvents?: number;
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
    let localBuffer = [];
    let flushAfter: number | null = null;
    let sourceEventsYielded = 0;
    for (const eventSource of eventSources) {
      for (const event of eventSource) {
        const eventDate = event['@timestamp'] as number;
        localBuffer.push(event);
        if (flushAfter === null && eventDate !== null)
          flushAfter = moment(eventDate).add(this.intervalAmount, this.intervalUnit).valueOf();

        yield StreamProcessor.enrich(event);
        sourceEventsYielded++;
        if (this.options.maxSourceEvents && sourceEventsYielded >= this.options.maxSourceEvents) {
          // yielded the maximum source events, we still want the local buffer to generate derivative documents
          break;
        }
        if (
          (flushAfter !== null && eventDate > flushAfter) ||
          localBuffer.length === (this.options.maxBufferSize ?? 10000)
        ) {
          for (const processor of this.options.processors) {
            yield* processor(localBuffer).map(StreamProcessor.enrich);
          }
          localBuffer = [];
          flushAfter = moment(flushAfter).add(this.intervalAmount, this.intervalUnit).valueOf();
        }
      }
      if (this.options.maxSourceEvents && sourceEventsYielded >= this.options.maxSourceEvents) {
        break;
      }
    }
    if (localBuffer.length > 0) {
      for (const processor of this.options.processors) {
        yield* processor(localBuffer).map(StreamProcessor.enrich);
      }
    }
  }
  async *streamAsync(...eventSources: SpanIterable[]): AsyncIterator<ApmFields> {
    yield* this.stream(...eventSources);
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
        if (!d.transaction || !d.span) {
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
