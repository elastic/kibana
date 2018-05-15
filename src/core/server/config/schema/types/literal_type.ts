import { Type } from './type';
import { SchemaTypeError } from '../errors';

export class LiteralType<T> extends Type<T> {
  constructor(private readonly value: T) {
    super();
  }

  process(value: any, context?: string): T {
    if (value !== this.value) {
      throw new SchemaTypeError(
        `expected value to equal [${this.value}] but got [${value}]`,
        context
      );
    }

    return value;
  }
}
