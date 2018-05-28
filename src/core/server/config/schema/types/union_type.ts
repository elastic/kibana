import { SchemaTypesError } from '../errors';
import { AnyType } from './any_type';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export class UnionType<RTS extends AnyType[], T> extends Type<T> {
  constructor(public readonly types: RTS, options?: TypeOptions<T>) {
    super(options);
  }

  public process(value: any, context?: string): T {
    const errors = [];

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
