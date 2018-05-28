import { SchemaTypeError } from '../errors';
import { Type } from './type';

export class LiteralType<T> extends Type<T> {
  constructor(private readonly value: T) {
    super();
  }

  public process(value: any, context?: string): T {
    if (value !== this.value) {
      throw new SchemaTypeError(
        `expected value to equal [${this.value}] but got [${value}]`,
        context
      );
    }

    return value;
  }
}
