import typeDetect from 'type-detect';

import { Type, TypeOptions } from './type';
import { TypeError } from './utils/errors';

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
};

class StringType extends Type<string> {
  private readonly minLength: number | void;
  private readonly maxLength: number | void;

  constructor(options: StringOptions = {}) {
    super(options);
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
  }

  process(value: any, context?: string): string {
    if (typeof value !== 'string') {
      throw new TypeError(
        `expected value of type [string] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minLength && value.length < this.minLength) {
      throw new TypeError(
        `value is [${value}] but it must have a minimum length of [${
          this.minLength
        }].`,
        context
      );
    }

    if (this.maxLength && value.length > this.maxLength) {
      throw new TypeError(
        `value is [${value}] but it must have a maximum length of [${
          this.maxLength
        }].`,
        context
      );
    }

    return value;
  }
}

export function string(options?: StringOptions): Type<string> {
  return new StringType(options);
}
