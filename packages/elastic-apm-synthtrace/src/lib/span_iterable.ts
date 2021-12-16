import { ApmFields } from './apm/apm_fields';
import { Interval } from './interval';

export interface SpanIterable extends Iterable<ApmFields>, AsyncIterable<ApmFields> {
  toArray(): ApmFields[];

  concat(...iterables: SpanIterable[]): ConcatenatedSpanGenerators;
}

export class SpanGenerator implements SpanIterable {
  constructor(
    private readonly interval: Interval,
    private readonly dataGenerator: Array<(interval: Interval) => Generator<ApmFields>>,
  ) {
  }

  toArray(): ApmFields[] {
    return Array.from(this);
  }

  concat(...iterables: SpanGenerator[]) {
    return new ConcatenatedSpanGenerators([this, ...iterables]);
  }

  * [Symbol.iterator]() {
    for (const iterator of this.dataGenerator) {
      for (const fields of iterator(this.interval)) {
        yield fields;
      }
    }
  }

  async* [Symbol.asyncIterator]() {
    for (const iterator of this.dataGenerator) {
      for (const fields of iterator(this.interval)) {
        yield fields;
      }
    }
  }
}

export class ConcatenatedSpanGenerators implements SpanIterable {
  constructor(private readonly dataGenerators: SpanIterable[]) {
  }

  toArray(): ApmFields[] {
    return Array.from(this);
  }

  concat(...iterables: SpanIterable[]) {
    return new ConcatenatedSpanGenerators([...this.dataGenerators, ...iterables]);
  }

  * [Symbol.iterator]() {
    for (const iterator of this.dataGenerators) {
      for (const fields of iterator) {
        yield fields;
      }
    }
  }

  async* [Symbol.asyncIterator]() {
    for (const iterator of this.dataGenerators) {
      for (const fields of iterator) {
        yield fields;
      }
    }
  }
}
