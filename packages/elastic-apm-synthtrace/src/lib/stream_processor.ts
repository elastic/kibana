import { ApmFields } from './apm/apm_fields';
import { SpanIterable } from './span_iterable';
import moment from 'moment';
import { getTransactionMetrics } from './apm/processors/get_transaction_metrics';
import { getSpanDestinationMetrics } from './apm/processors/get_span_destination_metrics';
import { getBreakdownMetrics } from './apm/processors/get_breakdown_metrics';
import { parseInterval } from './interval';

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

        yield event;
        if (
          (flushAfter !== null && eventDate > flushAfter) ||
          localBuffer.length === (this.options.maxBufferSize ?? 10000)
        ) {
          for (const processor of this.options.processors) {
            yield* processor(localBuffer);
          }
          localBuffer = [];
          flushAfter = moment(flushAfter).add(this.intervalAmount, this.intervalUnit).valueOf();
        }
      }
    }
    if (localBuffer.length > 0) {
      for (const processor of this.options.processors) {
        yield* processor(localBuffer);
      }
    }
  }
  async *streamAsync(...eventSources: SpanIterable[]) : AsyncIterator<ApmFields> {
    yield* this.stream(...eventSources);
  }
  streamToArray(...eventSources: SpanIterable[]) {
    return Array.from<ApmFields>(this.stream(...eventSources))
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
