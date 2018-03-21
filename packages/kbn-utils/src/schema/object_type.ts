import typeDetect from 'type-detect';
import isPlainObject from 'lodash.isplainobject';
import difference from 'lodash.difference';
import { Any, TypeOf, TypeOptions, Type } from './type';
import { TypeError } from './utils/errors';
import { toContext } from './utils/to_context';

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
