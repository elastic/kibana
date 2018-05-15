import typeDetect from 'type-detect';
import { Type } from './type';
import { SchemaTypeError } from '../errors';

export class BooleanType extends Type<boolean> {
  process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new SchemaTypeError(
        `expected value of type [boolean] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}
