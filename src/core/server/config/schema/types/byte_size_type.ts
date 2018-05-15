import typeDetect from 'type-detect';
import { Type } from './type';
import { ByteSizeValue } from '../byte_size_value';
import { SchemaTypeError } from '../errors';

export type ByteSizeOptions = {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: ByteSizeValue) => string | void;
  defaultValue?: ByteSizeValue | string | number;
  min?: ByteSizeValue | string | number;
  max?: ByteSizeValue | string | number;
};

function ensureByteSizeValue(value?: ByteSizeValue | string | number) {
  if (typeof value === 'string') {
    return ByteSizeValue.parse(value);
  }

  if (typeof value === 'number') {
    return new ByteSizeValue(value);
  }

  return value;
}

export class ByteSizeType extends Type<ByteSizeValue> {
  private readonly min: ByteSizeValue | void;
  private readonly max: ByteSizeValue | void;

  constructor(options: ByteSizeOptions = {}) {
    const { defaultValue, min, max, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureByteSizeValue(defaultValue),
    });

    this.min = ensureByteSizeValue(min);
    this.max = ensureByteSizeValue(max);
  }

  process(value: any, context?: string): ByteSizeValue {
    if (typeof value === 'string') {
      value = ByteSizeValue.parse(value);
    }

    if (typeof value === 'number') {
      value = new ByteSizeValue(value);
    }

    if (!(value instanceof ByteSizeValue)) {
      throw new SchemaTypeError(
        `expected value of type [ByteSize] but got [${typeDetect(value)}]`,
        context
      );
    }

    const { min, max } = this;

    if (min && value.isLessThan(min)) {
      throw new SchemaTypeError(
        `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or greater than [${min.toString()}]`,
        context
      );
    }

    if (max && value.isGreaterThan(max)) {
      throw new SchemaTypeError(
        `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or less than [${max.toString()}]`,
        context
      );
    }

    return value;
  }
}
