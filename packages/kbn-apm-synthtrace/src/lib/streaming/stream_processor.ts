/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { SignalIterable } from './signal_iterable';
import { parseInterval } from '../../dsl/interval';
import { Logger } from '../utils/create_logger';
import { StreamAggregator } from './stream_aggregator';
import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';

export type BufferedAggregator<TFields> = (events: TFields[]) => Array<Signal<TFields>>;
export interface StreamProcessorOptions<TFields extends Fields> {
  version?: string;
  processors?: Array<BufferedAggregator<TFields>>;
  streamAggregators?: Array<StreamAggregator<TFields, TFields>>;
  flushInterval?: string;
  // defaults to 10k
  maxBufferSize?: number;
  // the maximum source events to process, not the maximum documents outputted by the processor
  maxSourceEvents?: number;
  logger?: Logger;
  name?: string;
  // called everytime maxBufferSize is processed
  processedCallback?: (processedDocuments: number) => void;
}

export class StreamProcessor<TFields extends Fields> {
  public static defaultFlushInterval: number = 10000;
  private readonly processors: Array<(events: TFields[]) => Array<Signal<TFields>>>;
  private readonly streamAggregators: Array<StreamAggregator<TFields, TFields>>;

  constructor(private readonly options: StreamProcessorOptions<TFields>) {
    const { intervalAmount, intervalUnit } = this.options.flushInterval
      ? parseInterval(this.options.flushInterval)
      : parseInterval('1m');
    this.intervalAmount = intervalAmount;
    this.intervalUnit = intervalUnit;
    this.name = this.options?.name ?? 'StreamProcessor';
    this.version = this.options.version ?? '8.0.0';
    this.versionMajor = Number.parseInt(this.version.split('.')[0], 10);
    this.processors = options.processors ?? [];
    this.streamAggregators = options.streamAggregators ?? [];
  }

  private readonly intervalAmount: number;
  private readonly intervalUnit: any;
  public readonly name: string;
  public readonly version: string;
  private readonly versionMajor: number;

  // TODO move away from chunking and feed this data one by one to processors
  *stream(...eventSources: Array<SignalIterable<TFields>>): Generator<Signal<TFields>, any, any> {
    const maxBufferSize = this.options.maxBufferSize ?? StreamProcessor.defaultFlushInterval;
    const maxSourceEvents = this.options.maxSourceEvents;
    let localBuffer: TFields[] = [];
    let flushAfter: number | null = null;
    let sourceEventsYielded = 0;
    for (const eventSource of eventSources) {
      const order = eventSource.order();
      this.options.logger?.debug(`order: ${order}`);
      for (const event of eventSource) {
        const eventDate = event.fields['@timestamp'] as number;
        localBuffer.push(event.fields);
        if (flushAfter === null && eventDate !== null) {
          flushAfter = this.calculateFlushAfter(eventDate, order);
        }
        yield event.enrichWithVersionInformation(this.version, this.versionMajor);
        sourceEventsYielded++;
        for (const aggregator of this.streamAggregators) {
          const aggregatedEvents = aggregator.process(event.fields);
          if (aggregatedEvents) {
            yield* aggregatedEvents.map((d) =>
              d.enrichWithVersionInformation(this.version, this.versionMajor)
            );
          }
        }

        if (sourceEventsYielded % maxBufferSize === 0) {
          if (this.options?.processedCallback) {
            this.options.processedCallback(maxBufferSize);
          }
        }
        if (maxSourceEvents && sourceEventsYielded % maxBufferSize === 0) {
          this.options.logger?.debug(`${this.name} yielded ${sourceEventsYielded} events`);
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
            `${this.name} flush ${localBuffer.length} documents ${order}: ${e} => ${f}`
          );
          for (const processor of this.processors) {
            yield* processor(localBuffer).map((d) =>
              d.enrichWithVersionInformation(this.version, this.versionMajor)
            );
          }
          localBuffer = [];
          flushAfter = this.calculateFlushAfter(flushAfter, order);
        }
      }
      if (maxSourceEvents && sourceEventsYielded >= maxSourceEvents) {
        this.options.logger?.info(
          `${this.name} yielded maximum number of documents: ${maxSourceEvents}`
        );
        break;
      }
    }
    if (localBuffer.length > 0) {
      this.options.logger?.info(
        `${this.name} processing remaining buffer: ${localBuffer.length} items left`
      );
      for (const processor of this.processors) {
        yield* processor(localBuffer).map((d) =>
          d.enrichWithVersionInformation(this.version, this.versionMajor)
        );
      }
      this.options.processedCallback?.apply(this, [localBuffer.length]);
    }
    for (const aggregator of this.streamAggregators) {
      yield* aggregator.flush();
    }
  }

  private calculateFlushAfter(eventDate: number | null, order: 'asc' | 'desc') {
    if (order === 'desc') {
      return moment(eventDate).subtract(this.intervalAmount, this.intervalUnit).valueOf();
    } else {
      return moment(eventDate).add(this.intervalAmount, this.intervalUnit).valueOf();
    }
  }

  async *streamAsync(
    ...eventSources: Array<SignalIterable<TFields>>
  ): AsyncIterable<Signal<TFields>> & AsyncIterator<Signal<TFields>> {
    yield* this.stream(...eventSources);
  }

  *streamToDocument<TDocument>(
    map: (d: Signal<TFields>) => TDocument,
    ...eventSources: Array<SignalIterable<TFields>>
  ): Generator<TDocument> {
    for (const apmFields of this.stream(...eventSources)) {
      yield map(apmFields);
    }
  }

  async *streamToDocumentAsync<TDocument>(
    map: (d: Signal<TFields>) => TDocument,
    ...eventSources: Array<SignalIterable<TFields>>
  ): AsyncIterable<TDocument> & AsyncIterator<TDocument> {
    for await (const streamables of this.stream(...eventSources)) {
      yield map(streamables);
    }
  }

  streamToArray(...eventSources: Array<SignalIterable<TFields>>): TFields[] {
    return Array.from<Signal<TFields>>(this.stream(...eventSources)).map((e) => e.fields);
  }
}
