import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export type ArrayOptions<T> = TypeOptions<T[]> & {
  minSize?: number;
  maxSize?: number;
};

export class ArrayType<T> extends Type<T[]> {
  private readonly itemType: Type<T>;
  private readonly minSize?: number;
  private readonly maxSize?: number;

  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    super(options);
    this.itemType = type;
    this.minSize = options.minSize;
    this.maxSize = options.maxSize;
  }

  public process(value: any, context?: string): T[] {
    if (!Array.isArray(value)) {
      throw new SchemaTypeError(
        `expected value of type [array] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minSize != null && value.length < this.minSize) {
      throw new SchemaTypeError(
        `array size is [${value.length}], but cannot be smaller than [${
          this.minSize
        }]`,
        context
      );
    }

    if (this.maxSize != null && value.length > this.maxSize) {
      throw new SchemaTypeError(
        `array size is [${value.length}], but cannot be greater than [${
          this.maxSize
        }]`,
        context
      );
    }

    return value.map((val, i) =>
      this.itemType.validate(val, toContext(context, i))
    );
  }
}
