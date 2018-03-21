import typeDetect from 'type-detect';

import { Type, TypeOptions } from './type';
import { TypeError } from './utils/errors';

export class BooleanType extends Type<boolean> {
  process(value: any, context?: string): boolean {
    if (typeof value !== 'boolean') {
      throw new TypeError(
        `expected value of type [boolean] but got [${typeDetect(value)}]`,
        context
      );
    }

    return value;
  }
}

export function boolean(options?: TypeOptions<boolean>): Type<boolean> {
  return new BooleanType(options);
}
