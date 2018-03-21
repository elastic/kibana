import { Type } from './type';
import { TypeError } from './utils/errors';

export class MaybeType<V> extends Type<V | undefined> {
  private readonly type: Type<V>;

  constructor(type: Type<V>) {
    super();
    this.type = type;
  }

  process(value: any, context?: string): V | undefined {
    if (value === undefined) {
      return value;
    }

    if (value === null) {
      throw new TypeError(
        `expected value to either be undefined or defined, but not [null]`,
        context
      );
    }

    return this.type.validate(value, context);
  }
}

/**
 * Create an optional type
 */
export function maybe<V>(type: Type<V>): Type<V | undefined> {
  return new MaybeType(type);
}
