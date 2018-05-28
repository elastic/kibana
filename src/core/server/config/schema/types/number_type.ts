import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { Type, TypeOptions } from './type';

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
};

export class NumberType extends Type<number> {
  private readonly min: number | void;
  private readonly max: number | void;

  constructor(options: NumberOptions = {}) {
    super(options);
    this.min = options.min;
    this.max = options.max;
  }

  public process(value: any, context?: string): number {
    const type = typeDetect(value);

    // Do we want to allow strings that can be converted, e.g. "2"? (Joi does)
    // (this can for example be nice in http endpoints with query params)
    //
    // From Joi docs on `Joi.number`:
    // > Generates a schema object that matches a number data type (as well as
    // > strings that can be converted to numbers)
    if (typeof value === 'string') {
      value = Number(value);
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new SchemaTypeError(
        `expected value of type [number] but got [${type}]`,
        context
      );
    }

    if (this.min && value < this.min) {
      throw new SchemaTypeError(
        `Value is [${value}] but it must be equal to or greater than [${
          this.min
        }].`,
        context
      );
    }

    if (this.max && value > this.max) {
      throw new SchemaTypeError(
        `Value is [${value}] but it must be equal to or lower than [${
          this.max
        }].`,
        context
      );
    }

    return value;
  }
}
