// @flow

import typeOf from 'type-detect';
import { difference, isPlainObject } from 'lodash';

import { SettingError } from './SettingError';
import { ByteSizeValue } from '../ByteSizeValue';

function toContext(parent?: string, child: string | number) {
  return parent ? `${parent}.${child}` : String(child);
}

type SettingOptions<T> = {
  defaultValue?: T,
  validate?: (value: T) => string | void
};

const noop = () => {};

class Setting<V> {
  _defaultValue: V | void;
  _validate: (value: V) => string | void;

  constructor(options: SettingOptions<V> = {}) {
    this._defaultValue = options.defaultValue;
    this._validate = options.validate || noop;
  }

  validate(value: mixed = this._defaultValue, context?: string): V {
    const result = this._process(value, context);

    const validation = this._validate(result);
    if (typeof validation === 'string') {
      throw new SettingError(validation, context);
    }

    return result;
  }

  _process(value: any, context?: string): V {
    const message = `${this.constructor.name}._process(value) is not implemented`;
    throw new SettingError(message, context);
  }
}

class MaybeSetting<V> extends Setting<V | null | void> {
  setting: Setting<V>;

  constructor(setting: Setting<V>) {
    super();
    this.setting = setting;
  }

  _process(value: any, context?: string): V | null | void {
    if (value == null) {
      return value;
    }

    return this.setting._process(value, context);
  }
}

class BooleanSetting extends Setting<boolean> {
  _process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new SettingError(
        `expected value of type [boolean] but got ${typeOf(value)}`,
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
  _minLength: number | void;
  _maxLength: number | void;

  constructor(options: StringOptions = {}) {
    super(options);
    this._minLength = options.minLength;
    this._maxLength = options.maxLength;
  }

  _process(value: any, context?: string): string {
    if (typeof value !== 'string') {
      throw new SettingError(
        `expected value of type [string] but got ${typeOf(value)}`,
        context
      );
    }

    if (this._minLength && value.length < this._minLength) {
      throw new SettingError(
        `value is [${value}] but it must have a minimum length of [${this._minLength}].`,
        context
      );
    }

    if (this._maxLength && value.length > this._maxLength) {
      throw new SettingError(
        `value is [${value}] but it must have a maximum length of [${this._maxLength}].`,
        context
      );
    }

    return value;
  }
}

type NumberOptions = SettingOptions<number> & {
  min?: number,
  max?: number
};

class NumberSetting extends Setting<number> {
  _min: number | void;
  _max: number | void;

  constructor(options: NumberOptions = {}) {
    super(options);
    this._min = options.min;
    this._max = options.max;
  }

  _process(value: any, context?: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new SettingError(
        `expected value of type [number] but got [${typeOf(value)}]`,
        context
      );
    }

    if (this._min && value < this._min) {
      throw new SettingError(
        `Value is [${value}] but it must be equal to or greater than [${this._min}].`,
        context
      );
    }

    if (this._max && value > this._max) {
      throw new SettingError(
        `Value is [${value}] but it must be equal to or lower than [${this._max}].`,
        context
      );
    }

    return value;
  }
}

type ByteSizeOptions = SettingOptions<ByteSizeValue> & {
  // we need to special-case defaultValue as we want to handle string inputs too
  defaultValue?: ByteSizeValue | string,
  min?: ByteSizeValue | string,
  max?: ByteSizeValue | string
};

function ensureByteSizeValue(value?: ByteSizeValue | string) {
  return typeof value === 'string' ? ByteSizeValue.parse(value) : value;
}

class ByteSizeSetting extends Setting<ByteSizeValue> {
  _min: ByteSizeValue | void;
  _max: ByteSizeValue | void;

  constructor(options: ByteSizeOptions = {}) {
    const { defaultValue, min, max, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureByteSizeValue(defaultValue)
    });

    this._min = ensureByteSizeValue(min);
    this._max = ensureByteSizeValue(max);
  }

  _process(value: any, context?: string): ByteSizeValue {
    if (typeof value === 'string') {
      value = ByteSizeValue.parse(value);
    }

    if (!(value instanceof ByteSizeValue)) {
      throw new SettingError(
        `expected value of type [ByteSize] but got ${typeOf(value)}`,
        context
      );
    }

    const { _min, _max } = this;

    if (_min && value.isLessThan(_min)) {
      throw new SettingError(
        `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or greater than [${_min.toString()}]`,
        context
      );
    }

    if (_max && value.isGreaterThan(_max)) {
      throw new SettingError(
        `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or less than [${_max.toString()}]`,
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
  _itemSetting: Setting<T>;
  _minSize: number | void;
  _maxSize: number | void;

  constructor(setting: Setting<T>, options: ArrayOptions<T> = {}) {
    super(options);
    this._itemSetting = setting;
    this._minSize = options.minSize;
    this._maxSize = options.maxSize;
  }

  _process(value: any, context?: string): Array<T> {
    if (!Array.isArray(value)) {
      throw new SettingError(
        `expected value of type [array] but got ${typeOf(value)}`,
        context
      );
    }

    if (this._minSize != null && value.length < this._minSize) {
      throw new SettingError(
        `array size is [${value.length}], but cannot be smaller than [${this._minSize}]`,
        context
      );
    }

    if (this._maxSize != null && value.length > this._maxSize) {
      throw new SettingError(
        `array size is [${value.length}], but cannot be greater than [${this._maxSize}]`,
        context
      );
    }

    return value.map((val, i) =>
      this._itemSetting.validate(val, toContext(context, i)));
  }
}

// We're extracting the type of a Setting
type ExtractSettingType = <V>(Setting<V>) => V;

type ExtractType<T, RT: Setting<T>> = T; // eslint-disable-line no-unused-vars

export type TypeOf<RT> = ExtractType<*, RT>;

// We're building up a new object with the same keys as the
// input, but with the types of the values being extracted
// from their corresponding Setting type, e.g.
//
//   `{ name: Setting<string> }`
//
// becomes
//
//   `{ name: string }`
type ObjectValueType<T> = $ObjMap<T, ExtractSettingType>;

class ObjectSetting<S: { [string]: Setting<*> }>
  extends Setting<ObjectValueType<S>> {
  schema: S;

  constructor(schema: S, options?: SettingOptions<S> = {}) {
    super({
      ...options,
      defaultValue: options.defaultValue || {}
    });
    this.schema = schema;
  }

  _process(value: any, context?: string): ObjectValueType<S> {
    if (!isPlainObject(value)) {
      throw new SettingError(
        `expected a plain object value, but found [${typeOf(value)}] instead.`,
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
      (newObject, key) => {
        const setting: Setting<*> = this.schema[key];
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

export function number(options?: NumberOptions): Setting<number> {
  return new NumberSetting(options);
}

export function byteSize(options?: ByteSizeOptions): Setting<ByteSizeValue> {
  return new ByteSizeSetting(options);
}

export function maybe<V>(setting: Setting<V>): MaybeSetting<V> {
  return new MaybeSetting(setting);
}

export function object<T: { [string]: Setting<*> }>(
  schema: T,
  options?: SettingOptions<T>
): Setting<ObjectValueType<T>> {
  return new ObjectSetting(schema, options);
}

export function arrayOf<T>(
  itemSetting: Setting<T>,
  options?: ArrayOptions<T>
): Setting<Array<T>> {
  return new ArraySetting(itemSetting, options);
}
