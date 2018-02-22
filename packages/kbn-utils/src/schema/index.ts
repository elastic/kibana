import typeDetect from 'type-detect';
import { difference, isPlainObject } from 'lodash';
import { duration as momentDuration, isDuration, Duration } from 'moment';

import { TypeError, TypesError } from './errors';
import { ByteSizeValue } from '../byte_size_value';

function toContext(parent: string = '', child: string | number) {
  return parent ? `${parent}.${child}` : String(child);
}

export type Any = Type<any>;
export type TypeOf<RT extends Any> = RT['_type'];

export type TypeOptions<T> = {
  defaultValue?: T;
  validate?: (value: T) => string | void;
};

const noop = () => {};

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  readonly _type: V = null! as V;
  private readonly defaultValue?: V | void;
  private readonly validateResult: (value: V) => string | void;

  constructor(options: TypeOptions<V> = {}) {
    this.defaultValue = options.defaultValue;
    this.validateResult = options.validate || noop;
  }

  validate(value: any = this.defaultValue, context?: string): V {
    const result = this.process(value, context);

    const validation = this.validateResult(result);
    if (typeof validation === 'string') {
      throw new TypeError(validation, context);
    }

    return result;
  }

  protected abstract process(value: any, context?: string): V;
}

class MaybeType<V> extends Type<V | undefined> {
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

class BooleanType extends Type<boolean> {
  process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new TypeError(
        `expected value of type [boolean] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}

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

class UnionType<RTS extends Array<Any>, T> extends Type<T> {
  constructor(public readonly types: RTS, options?: TypeOptions<T>) {
    super(options);
  }

  process(value: any, context?: string): T {
    let errors = [];

    for (const i in this.types) {
      try {
        return this.types[i].validate(value, toContext(context, i));
      } catch (e) {
        errors.push(e);
      }
    }

    throw new TypesError(errors, 'types that failed validation', context);
  }
}

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
};

class NumberType extends Type<number> {
  private readonly min: number | void;
  private readonly max: number | void;

  constructor(options: NumberOptions = {}) {
    super(options);
    this.min = options.min;
    this.max = options.max;
  }

  process(value: any, context?: string): number {
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
      throw new TypeError(
        `expected value of type [number] but got [${type}]`,
        context
      );
    }

    if (this.min && value < this.min) {
      throw new TypeError(
        `Value is [${value}] but it must be equal to or greater than [${
          this.min
        }].`,
        context
      );
    }

    if (this.max && value > this.max) {
      throw new TypeError(
        `Value is [${value}] but it must be equal to or lower than [${
          this.max
        }].`,
        context
      );
    }

    return value;
  }
}

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

class ByteSizeType extends Type<ByteSizeValue> {
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
      throw new TypeError(
        `expected value of type [ByteSize] but got [${typeDetect(value)}]`,
        context
      );
    }

    const { min, max } = this;

    if (min && value.isLessThan(min)) {
      throw new TypeError(
        `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or greater than [${min.toString()}]`,
        context
      );
    }

    if (max && value.isGreaterThan(max)) {
      throw new TypeError(
        `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or less than [${max.toString()}]`,
        context
      );
    }

    return value;
  }
}

export type DurationOptions = {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: Duration) => string | void;
  defaultValue?: Duration | string | number;
};

function ensureDuration(value?: Duration | string | number) {
  if (typeof value === 'string') {
    return stringToDuration(value);
  }

  if (typeof value === 'number') {
    return numberToDuration(value);
  }

  return value;
}

const timeFormatRegex = /^(0|[1-9][0-9]*)(ms|s|m|h|d|w|M|Y)$/;

function stringToDuration(text: string) {
  const result = timeFormatRegex.exec(text);
  if (!result) {
    throw new Error(
      `Failed to parse [${text}] as time value. ` +
        `Format must be <count>[ms|s|m|h|d|w|M|Y] (e.g. '70ms', '5s', '3d', '1Y')`
    );
  }

  const count = parseInt(result[1]);
  const unit = result[2] as any;

  return momentDuration(count, unit);
}

function numberToDuration(numberMs: number) {
  if (!Number.isSafeInteger(numberMs) || numberMs < 0) {
    throw new Error(
      `Failed to parse [${numberMs}] as time value. ` +
        `Value should be a safe positive integer number.`
    );
  }

  return momentDuration(numberMs);
}

class DurationType extends Type<Duration> {
  constructor(options: DurationOptions = {}) {
    const { defaultValue, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureDuration(defaultValue),
    });
  }

  process(value: any, context?: string): Duration {
    if (typeof value === 'string') {
      value = stringToDuration(value);
    }

    if (typeof value === 'number') {
      value = numberToDuration(value);
    }

    if (!isDuration(value)) {
      throw new TypeError(
        `expected value of type [moment.Duration] but got [${typeDetect(
          value
        )}]`,
        context
      );
    }

    return value;
  }
}

export type ArrayOptions<T> = TypeOptions<Array<T>> & {
  minSize?: number;
  maxSize?: number;
};

class ArrayType<T> extends Type<Array<T>> {
  private readonly itemType: Type<T>;
  private readonly minSize?: number;
  private readonly maxSize?: number;

  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    super(options);
    this.itemType = type;
    this.minSize = options.minSize;
    this.maxSize = options.maxSize;
  }

  process(value: any, context?: string): Array<T> {
    if (!Array.isArray(value)) {
      throw new TypeError(
        `expected value of type [array] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minSize != null && value.length < this.minSize) {
      throw new TypeError(
        `array size is [${value.length}], but cannot be smaller than [${
          this.minSize
        }]`,
        context
      );
    }

    if (this.maxSize != null && value.length > this.maxSize) {
      throw new TypeError(
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

export type Props = Record<string, Any>;

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.

export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof P]: TypeOf<P[K]> }
>;

export class ObjectType<P extends Props = Props> extends Type<
  ObjectResultType<P>
> {
  constructor(
    private readonly schema: P,
    options: TypeOptions<{ [K in keyof P]: TypeOf<P[K]> }> = {}
  ) {
    super({
      ...options,
      defaultValue: options.defaultValue,
    });
  }

  process(value: any = {}, context?: string): ObjectResultType<P> {
    if (!isPlainObject(value)) {
      throw new TypeError(
        `expected a plain object value, but found [${typeDetect(
          value
        )}] instead.`,
        context
      );
    }

    const schemaKeys = Object.keys(this.schema);
    const valueKeys = Object.keys(value);

    // Do we have keys that exist in the values, but not in the schema?
    const missingInSchema = difference(valueKeys, schemaKeys);

    if (missingInSchema.length > 0) {
      throw new TypeError(
        `missing definitions in schema for keys [${missingInSchema.join(',')}]`,
        context
      );
    }

    return schemaKeys.reduce((newObject: any, key) => {
      const type = this.schema[key];
      newObject[key] = type.validate(value[key], toContext(context, key));
      return newObject;
    }, {});
  }
}

export type PartialObjectResultType<P extends Props> = Readonly<
  { [K in keyof P]?: TypeOf<P[K]> }
>;

export class PartialObjectType<P extends Props = Props> extends Type<
  PartialObjectResultType<P>
> {
  constructor(
    private readonly schema: P,
    options: TypeOptions<{ [K in keyof P]: TypeOf<P[K]> }> = {}
  ) {
    super({
      ...options,
      defaultValue: options.defaultValue,
    } as any);
  }

  process(value: any = {}, context?: string): ObjectResultType<P> {
    if (!isPlainObject(value)) {
      throw new TypeError(
        `expected a plain object value, but found [${typeDetect(
          value
        )}] instead.`,
        context
      );
    }

    const schemaKeys = Object.keys(this.schema);
    const valueKeys = Object.keys(value);

    // Do we have keys that exist in the values, but not in the schema?
    const missingInSchema = difference(valueKeys, schemaKeys);

    if (missingInSchema.length > 0) {
      throw new TypeError(
        `missing definitions in schema for keys [${missingInSchema.join(',')}]`,
        context
      );
    }

    return schemaKeys.reduce((newObject: any, key) => {
      if (valueKeys.includes(key)) {
        const type = this.schema[key];
        newObject[key] = type.validate(value[key], toContext(context, key));
      }
      return newObject;
    }, {});
  }
}

function isMap<K, V>(o: any): o is Map<K, V> {
  return o instanceof Map;
}

export type MapOfOptions<K, V> = TypeOptions<Map<K, V>>;

class MapOfType<K, V> extends Type<Map<K, V>> {
  constructor(
    private readonly keyType: Type<K>,
    private readonly valueType: Type<V>,
    options: MapOfOptions<K, V> = {}
  ) {
    super(options);
  }

  process(obj: any, context?: string): Map<K, V> {
    if (isPlainObject(obj)) {
      const entries = Object.keys(obj).map(key => [key, obj[key]]);
      return this.processEntries(entries, context);
    }

    if (isMap(obj)) {
      return this.processEntries([...obj], context);
    }

    throw new TypeError(
      `expected value of type [Map] or [object] but got [${typeDetect(obj)}]`,
      context
    );
  }

  processEntries(entries: any[][], context?: string) {
    const res = entries.map(([key, value]) => {
      const validatedKey = this.keyType.validate(
        key,
        toContext(context, String(key))
      );
      const validatedValue = this.valueType.validate(
        value,
        toContext(context, String(key))
      );

      return [validatedKey, validatedValue] as [K, V];
    });

    return new Map(res);
  }
}

export function boolean(options?: TypeOptions<boolean>): Type<boolean> {
  return new BooleanType(options);
}

export function string(options?: StringOptions): Type<string> {
  return new StringType(options);
}

export function literal<T extends string | number | boolean>(
  value: T
): Type<T> {
  return new LiteralType(value);
}

export function number(options?: NumberOptions): Type<number> {
  return new NumberType(options);
}

export function byteSize(options?: ByteSizeOptions): Type<ByteSizeValue> {
  return new ByteSizeType(options);
}

export function duration(options?: DurationOptions): Type<Duration> {
  return new DurationType(options);
}

/**
 * Create an optional type
 */
export function maybe<V>(type: Type<V>): Type<V | undefined> {
  return new MaybeType(type);
}

export function object<P extends Props>(
  schema: P,
  options?: TypeOptions<{ [K in keyof P]: TypeOf<P[K]> }>
): ObjectType<P> {
  return new ObjectType(schema, options);
}

export function partialObject<P extends Props>(
  schema: P,
  options?: TypeOptions<{ [K in keyof P]: TypeOf<P[K]> }>
): PartialObjectType<P> {
  return new PartialObjectType(schema, options);
}

export function arrayOf<T>(
  itemType: Type<T>,
  options?: ArrayOptions<T>
): Type<Array<T>> {
  return new ArrayType(itemType, options);
}

export function mapOf<K, V>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: MapOfOptions<K, V>
): Type<Map<K, V>> {
  return new MapOfType(keyType, valueType, options);
}

export function oneOf<A, B, C, D, E, F, G, H, I, J>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>,
    Type<J>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I | J>
): Type<A | B | C | D | E | F | G | H | I | J>;
export function oneOf<A, B, C, D, E, F, G, H, I>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I>
): Type<A | B | C | D | E | F | G | H | I>;
export function oneOf<A, B, C, D, E, F, G, H>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H>
): Type<A | B | C | D | E | F | G | H>;
export function oneOf<A, B, C, D, E, F, G>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>],
  options?: TypeOptions<A | B | C | D | E | F | G>
): Type<A | B | C | D | E | F | G>;
export function oneOf<A, B, C, D, E, F>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>],
  options?: TypeOptions<A | B | C | D | E | F>
): Type<A | B | C | D | E | F>;
export function oneOf<A, B, C, D, E>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>],
  options?: TypeOptions<A | B | C | D | E>
): Type<A | B | C | D | E>;
export function oneOf<A, B, C, D>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>],
  options?: TypeOptions<A | B | C | D>
): Type<A | B | C | D>;
export function oneOf<A, B, C>(
  types: [Type<A>, Type<B>, Type<C>],
  options?: TypeOptions<A | B | C>
): Type<A | B | C>;
export function oneOf<A, B>(
  types: [Type<A>, Type<B>],
  options?: TypeOptions<A | B>
): Type<A | B>;
export function oneOf<A>(types: [Type<A>], options?: TypeOptions<A>): Type<A>;
export function oneOf<RTS extends Array<Any>>(
  types: RTS,
  options?: TypeOptions<any>
): Type<any> {
  return new UnionType(types, options);
}
