import { SchemaTypeError } from '../errors';

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
  private readonly _defaultValue: V | void;
  private readonly _validateResult: (value: V) => string | void;

  constructor({ defaultValue, validate }: TypeOptions<V> = {}) {
    this._defaultValue = defaultValue;
    this._validateResult = validate || noop;
  }

  validate(value: any = this._defaultValue, context?: string): V {
    const result = this.process(value, context);

    const validation = this._validateResult(result);
    if (typeof validation === 'string') {
      throw new SchemaTypeError(validation, context);
    }

    return result;
  }

  protected abstract process(value: any, context?: string): V;
}
