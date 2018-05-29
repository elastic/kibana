import { SchemaTypeError } from '../errors';

export interface TypeOptions<T> {
  defaultValue?: T;
  validate?: (value: T) => string | void;
}

const noop = () => {
  // noop
};

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;
  private readonly defaultValue: V | void;
  private readonly validateResult: (value: V) => string | void;

  constructor({ defaultValue, validate }: TypeOptions<V> = {}) {
    this.defaultValue = defaultValue;
    this.validateResult = validate || noop;
  }

  public validate(value: any = this.defaultValue, context?: string): V {
    const result = this.process(value, context);

    const validation = this.validateResult(result);
    if (typeof validation === 'string') {
      throw new SchemaTypeError(validation, context);
    }

    return result;
  }

  protected abstract process(value: any, context?: string): V;
}
