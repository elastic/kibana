import { difference, isPlainObject } from 'lodash';
import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { AnyType } from './any_type';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export type Props = Record<string, AnyType>;

export type TypeOf<RT extends AnyType> = RT['type'];

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.

export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof P]: TypeOf<P[K]> }
>;

export class ObjectType<P extends Props = any> extends Type<
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

  public process(value: any = {}, context?: string): ObjectResultType<P> {
    if (!isPlainObject(value)) {
      throw new SchemaTypeError(
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
      throw new SchemaTypeError(
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
