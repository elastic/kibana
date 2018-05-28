import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { Type } from './type';

export class BooleanType extends Type<boolean> {
  public process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new SchemaTypeError(
        `expected value of type [boolean] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}
