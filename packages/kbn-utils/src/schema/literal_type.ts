import { Type, TypeOptions } from './type';
import { TypeError } from './utils/errors';

class LiteralType<T> extends Type<T> {
  constructor(private readonly value: T) {
    super();
  }

  process(value: any, context?: string): T {
    if (value !== this.value) {
      throw new TypeError(
        `expected value to equal [${this.value}] but got [${value}]`,
        context
      );
    }

    return value;
  }
}

export function literal<T extends string | number | boolean>(
  value: T
): Type<T> {
  return new LiteralType(value);
}
