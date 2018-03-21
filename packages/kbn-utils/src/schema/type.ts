import { TypeError } from './utils/errors';

export type Any = Type<any>;
export type TypeOf<RT extends Any> = RT['_type'];

export type TypeOptions<T> = {
  defaultValue?: T;
  validate?: (value: T) => string | void;
};

const noop = () => {};

export abstract class Type<V> {
  // Needed to get `TypeOf` working
  readonly _type!: V;
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
