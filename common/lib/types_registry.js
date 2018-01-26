import { Registry } from '../../common/lib/registry';
import { Type } from '../../common/lib/type';

class TypesRegistry extends Registry {
  wrapper(obj) {
    return new Type(obj);
  }
}

export const typesRegistry = new TypesRegistry();
