// TODO Change to require, had problems with `.default`
const typeDetect = require('type-detect');
import { difference, isPlainObject } from 'lodash';
import { duration as momentDuration, isDuration, Duration } from 'moment';

import { SettingError, SettingsError } from './SettingError';
import { ByteSizeValue } from '../ByteSizeValue';

function toContext(parent: string = '', child: string | number) {
  return parent ? `${parent}.${child}` : String(child);
}

export type Any = Setting<any>
export type TypeOf<RT extends Any> = RT['_type'];

type SettingOptions<T> = {
  defaultValue?: T,
  validate?: (value: T) => string | void
};

const noop = () => {};

export abstract class Setting<V> {
  // This is just to enable the `TypeOf` helper
  readonly _type: V;
  private readonly defaultValue: V | void;
  private readonly validateResult: (value: V) => string | void;

  constructor(options: SettingOptions<V> = {}) {
    this.defaultValue = options.defaultValue;
    this.validateResult = options.validate || noop;
  }

  validate(value: any = this.defaultValue, context?: string): V {
    const result = this.process(value, context);

    const validation = this.validateResult(result);
    if (typeof validation === 'string') {
      throw new SettingError(validation, context);
    }

    return result;
  }

  protected abstract process(value: any, context?: string): V;
}

class MaybeSetting<V> extends Setting<V | undefined> {
  private readonly setting: Setting<V>;

  constructor(setting: Setting<V>) {
    super();
    this.setting = setting;
  }

  process(value: any, context?: string): V | undefined {
    if (value === undefined) {
      return value;
    }

    if (value === null) {
      throw new SettingError(
        `expected value to either be undefined or defined, but not [null]`,
        context
      )
    }

    return this.setting.validate(value, context);
  }
}

class BooleanSetting extends Setting<boolean> {
  process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new SettingError(
        `expected value of type [boolean] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}

type StringOptions = SettingOptions<string> & {
  minLength?: number,
  maxLength?: number
};

class StringSetting extends Setting<string> {
  private readonly minLength: number | void;
  private readonly maxLength: number | void;

  constructor(options: StringOptions = {}) {
    super(options);
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
  }

  process(value: any, context?: string): string {
    if (typeof value !== 'string') {
      throw new SettingError(
        `expected value of type [string] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minLength && value.length < this.minLength) {
      throw new SettingError(
        `value is [${value}] but it must have a minimum length of [${this.minLength}].`,
        context
      );
    }

    if (this.maxLength && value.length > this.maxLength) {
      throw new SettingError(
        `value is [${value}] but it must have a maximum length of [${this.maxLength}].`,
        context
      );
    }

    return value;
  }
}

class LiteralSetting<T> extends Setting<T> {

  constructor(private readonly value: T) {
    super();
  }

  process(value: any, context?: string): T {
    if (value !== this.value) {
      throw new SettingError(
        `expected value to equal [${this.value}] but got [${value}]`,
        context
      );
    }

    return value;
  }
}

class UnionSetting<RTS extends Array<Any>, T> extends Setting<T> {

  constructor(public readonly settings: RTS, options?: SettingOptions<T>) {
    super(options);
  }

  process(value: any, context?: string): T {
    let errors = [];

    for (const i in this.settings) {
      try {
        return this.settings[i].validate(value, toContext(context, i))
      } catch(e) {
        errors.push(e);
      }
    }

    throw new SettingsError(errors, 'settings that failed validation', context);
  }
}

type NumberOptions = SettingOptions<number> & {
  min?: number,
  max?: number
};

class NumberSetting extends Setting<number> {
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
      throw new SettingError(
        `expected value of type [number] but got [${type}]`,
        context
      );
    }

    if (this.min && value < this.min) {
      throw new SettingError(
        `Value is [${value}] but it must be equal to or greater than [${this.min}].`,
        context
      );
    }

    if (this.max && value > this.max) {
      throw new SettingError(
        `Value is [${value}] but it must be equal to or lower than [${this.max}].`,
        context
      );
    }

    return value;
  }
}

type ByteSizeOptions = {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: ByteSizeValue) => string | void
  defaultValue?: ByteSizeValue | string,
  min?: ByteSizeValue | string,
  max?: ByteSizeValue | string
};

function ensureByteSizeValue(value?: ByteSizeValue | string) {
  return typeof value === 'string' ? ByteSizeValue.parse(value) : value;
}

class ByteSizeSetting extends Setting<ByteSizeValue> {
  private readonly min: ByteSizeValue | void;
  private readonly max: ByteSizeValue | void;

  constructor(options: ByteSizeOptions = {}) {
    const { defaultValue, min, max, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureByteSizeValue(defaultValue)
    });

    this.min = ensureByteSizeValue(min);
    this.max = ensureByteSizeValue(max);
  }

  process(value: any, context?: string): ByteSizeValue {
    if (typeof value === 'string') {
      value = ByteSizeValue.parse(value);
    }

    if (!(value instanceof ByteSizeValue)) {
      throw new SettingError(
        `expected value of type [ByteSize] but got [${typeDetect(value)}]`,
        context
      );
    }

    const { min, max } = this;

    if (min && value.isLessThan(min)) {
      throw new SettingError(
        `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or greater than [${min.toString()}]`,
        context
      );
    }

    if (max && value.isGreaterThan(max)) {
      throw new SettingError(
        `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or less than [${max.toString()}]`,
        context
      );
    }

    return value;
  }
}

type DurationOptions = {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: Duration) => string | void
  defaultValue?: Duration | string
};

function ensureDuration(value?: Duration | string) {
  return typeof value === 'string' ? stringToDuration(value) : value;
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
  const unit = result[2];

  return momentDuration(count, unit);
}

class DurationSetting extends Setting<Duration> {

  constructor(options: DurationOptions = {}) {
    const { defaultValue, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureDuration(defaultValue)
    });
  }

  process(value: any, context?: string): Duration {
    if (typeof value === 'string') {
      value = stringToDuration(value);
    }

    if (!isDuration(value)) {
      throw new SettingError(
        `expected value of type [moment.Duration] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}

type ArrayOptions<T> = SettingOptions<Array<T>> & {
  minSize?: number,
  maxSize?: number
};

class ArraySetting<T> extends Setting<Array<T>> {
  private readonly itemSetting: Setting<T>;
  private readonly minSize?: number;
  private readonly maxSize?: number;

  constructor(setting: Setting<T>, options: ArrayOptions<T> = {}) {
    super(options);
    this.itemSetting = setting;
    this.minSize = options.minSize;
    this.maxSize = options.maxSize;
  }

  process(value: any, context?: string): Array<T> {
    if (!Array.isArray(value)) {
      throw new SettingError(
        `expected value of type [array] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minSize != null && value.length < this.minSize) {
      throw new SettingError(
        `array size is [${value.length}], but cannot be smaller than [${this.minSize}]`,
        context
      );
    }

    if (this.maxSize != null && value.length > this.maxSize) {
      throw new SettingError(
        `array size is [${value.length}], but cannot be greater than [${this.maxSize}]`,
        context
      );
    }

    return value.map((val, i) =>
      this.itemSetting.validate(val, toContext(context, i)));
  }
}

export type Props = Record<string, Any>;

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.

type ObjectSettingType<P extends Props> = Readonly<{ [K in keyof P]: TypeOf<P[K]> }>

export class ObjectSetting<P extends Props> extends Setting<ObjectSettingType<P>> {

  constructor(
    private readonly schema: P,
    options: SettingOptions<{ [K in keyof P]: TypeOf<P[K]> }> = {}
  ) {
    super({
      ...options,
      defaultValue: options.defaultValue
    });
  }

  process(value: any = {}, context?: string): ObjectSettingType<P> {
    if (!isPlainObject(value)) {
      throw new SettingError(
        `expected a plain object value, but found [${typeDetect(value)}] instead.`,
        context
      );
    }

    const schemaKeys = Object.keys(this.schema);
    const valueKeys = Object.keys(value);

    // Do we have keys that exist in the values, but not in the schema?
    const missingInSchema = difference(valueKeys, schemaKeys);

    if (missingInSchema.length > 0) {
      throw new SettingError(
        `missing definitions in schema for keys [${missingInSchema.join(',')}]`,
        context
      );
    }

    return schemaKeys.reduce(
      (newObject: any, key) => {
        const setting = this.schema[key];
        newObject[key] = setting.validate(value[key], toContext(context, key));
        return newObject;
      },
      {}
    );
  }
}

export function boolean(options?: SettingOptions<boolean>): Setting<boolean> {
  return new BooleanSetting(options);
}

export function string(options?: StringOptions): Setting<string> {
  return new StringSetting(options);
}

export function literal<T extends string | number | boolean>(value: T): Setting<T> {
  return new LiteralSetting(value);
}

export function number(options?: NumberOptions): Setting<number> {
  return new NumberSetting(options);
}

export function byteSize(options?: ByteSizeOptions): Setting<ByteSizeValue> {
  return new ByteSizeSetting(options);
}

export function duration(options?: DurationOptions): Setting<Duration> {
  return new DurationSetting(options);
}

/**
 * Create an optional setting
 */
export function maybe<V>(setting: Setting<V>): Setting<V | undefined> {
  return new MaybeSetting(setting);
}

export function object<P extends Props>(
  schema: P,
  options?: SettingOptions<{ [K in keyof P]: TypeOf<P[K]> }>
): ObjectSetting<P> {
  return new ObjectSetting(schema, options);
}

export function arrayOf<T>(
  itemSetting: Setting<T>,
  options?: ArrayOptions<T>
): Setting<Array<T>> {
  return new ArraySetting(itemSetting, options);
}

export function oneOf<A, B, C, D>(types: [Setting<A>, Setting<B>, Setting<C>, Setting<D>], options?: SettingOptions<A | B | C | D>): UnionSetting<[Setting<A>, Setting<B>, Setting<C>, Setting<D>], A | B | C | D>
export function oneOf<A, B, C>(types: [Setting<A>, Setting<B>, Setting<C>], options?: SettingOptions<A | B | C>): UnionSetting<[Setting<A>, Setting<B>, Setting<C>], A | B | C>
export function oneOf<A, B>(types: [Setting<A>, Setting<B>], options?: SettingOptions<A | B>): UnionSetting<[Setting<A>, Setting<B>], A | B>
export function oneOf<A>(types: [Setting<A>], options?: SettingOptions<A>): UnionSetting<[Setting<A>], A>
export function oneOf<RTS extends Array<Any>>(types: RTS, options?: SettingOptions<any>): UnionSetting<RTS, any> {
  return new UnionSetting(types, options)
}
