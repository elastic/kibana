import { ApmFields } from './apm/apm_fields';
import { SpanIterable } from './span_iterable';
import moment from 'moment';
import { getTransactionMetrics } from './apm/processors/get_transaction_metrics';
import { getSpanDestinationMetrics } from './apm/processors/get_span_destination_metrics';
import { getBreakdownMetrics } from './apm/processors/get_breakdown_metrics';
import { parseInterval } from './interval';
import { getObserverDefaults } from './apm/defaults/get_observer_defaults';

export interface StreamProcessorOptions {
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  flushInterval?: string;
  maxBufferSize?: number;
}

export class StreamProcessor {
  constructor(private readonly options: StreamProcessorOptions) {
    [this.intervalAmount, this.intervalUnit] =
      this.options.flushInterval ? parseInterval(this.options.flushInterval) : parseInterval("1m");
  }
  static readonly observerDefaults = getObserverDefaults();

  private readonly intervalAmount: number;
  private readonly intervalUnit: any;
  static readonly apmProcessors = [
    getTransactionMetrics,
    getSpanDestinationMetrics,
    getBreakdownMetrics,
  ];

  // TODO move away from chunking and feed this data one by one to processors
  *stream(...eventSources: SpanIterable[]) {
    let localBuffer = [];
    let flushAfter: number | null = null;
    for (const eventSource of eventSources) {
      for (const event of eventSource) {
        const eventDate = event['@timestamp'] as number;
        localBuffer.push(event);
        if (flushAfter === null && eventDate !== null)
          flushAfter = moment(eventDate).add(this.intervalAmount, this.intervalUnit).valueOf();

        yield StreamProcessor.enrich(event);
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
    }
    if (localBuffer.length > 0) {
      for (const processor of this.options.processors) {
        yield* processor(localBuffer).map(StreamProcessor.enrich);
      }
    }
  }
  async *streamAsync(...eventSources: SpanIterable[]) : AsyncIterator<ApmFields> {
    yield* this.stream(...eventSources);
  }
  streamToArray(...eventSources: SpanIterable[]) {
    return Array.from<ApmFields>(this.stream(...eventSources))
  }

  static enrich(document:ApmFields) : ApmFields {
    // see https://github.com/elastic/apm-server/issues/7088 can not be provided as flat key/values
    document['observer'] = {
      version: '8.0.0',
      version_major: 8
    };
    document['service.node.name'] = document['service.node.name'] || document['container.id'] || document['host.name'];
    document['ecs.version'] = '1.4'
    // TODO this non standard field should not be enriched here
    if (document['processor.event'] != 'metric') {
      document['timestamp.us'] = document['@timestamp']! * 1000;
    }
    return document;
  }

}

export async function* streamProcessAsync(
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  ...eventSources: SpanIterable[]
) {
  return new StreamProcessor({processors}).streamAsync(...eventSources)
}

export function streamProcessToArray(
  processors: Array<(events: ApmFields[]) => ApmFields[]>,
  ...eventSources: SpanIterable[]
) {
  return new StreamProcessor({processors}).streamToArray(...eventSources);
}
