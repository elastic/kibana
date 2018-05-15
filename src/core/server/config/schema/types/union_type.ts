import { Type, TypeOptions } from './type';
import { toContext } from './index';
import { SchemaTypesError } from '../errors';
import { AnyType } from './any_type';

export class UnionType<RTS extends Array<AnyType>, T> extends Type<T> {
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

    throw new SchemaTypesError(errors, 'types that failed validation', context);
  }
}
