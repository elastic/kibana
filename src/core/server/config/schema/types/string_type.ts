import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { Type, TypeOptions } from './type';

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
};

export class StringType extends Type<string> {
  private readonly minLength: number | void;
  private readonly maxLength: number | void;

  constructor(options: StringOptions = {}) {
    super(options);
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
  }

  public process(value: any, context?: string): string {
    if (typeof value !== 'string') {
      throw new SchemaTypeError(
        `expected value of type [string] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minLength && value.length < this.minLength) {
      throw new SchemaTypeError(
        `value is [${value}] but it must have a minimum length of [${
          this.minLength
        }].`,
        context
      );
    }

    if (this.maxLength && value.length > this.maxLength) {
      throw new SchemaTypeError(
        `value is [${value}] but it must have a maximum length of [${
          this.maxLength
        }].`,
        context
      );
    }

    return value;
  }
}
