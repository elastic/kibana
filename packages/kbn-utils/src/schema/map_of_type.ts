import typeDetect from 'type-detect';
import isPlainObject from 'lodash.isplainobject';

import { TypeOptions, Type } from './type';
import { TypeError } from './utils/errors';
import { toContext } from './utils/to_context';

function isMap<K, V>(o: any): o is Map<K, V> {
  return o instanceof Map;
}

export type MapOfOptions<K, V> = TypeOptions<Map<K, V>>;

class MapOfType<K, V> extends Type<Map<K, V>> {
  constructor(
    private readonly keyType: Type<K>,
    private readonly valueType: Type<V>,
    options: MapOfOptions<K, V> = {}
  ) {
    super(options);
  }

  process(obj: any, context?: string): Map<K, V> {
    if (isPlainObject(obj)) {
      const entries = Object.keys(obj).map(key => [key, obj[key]]);
      return this.processEntries(entries, context);
    }

    if (isMap(obj)) {
      return this.processEntries([...obj], context);
    }

    throw new TypeError(
      `expected value of type [Map] or [object] but got [${typeDetect(obj)}]`,
      context
    );
  }

  processEntries(entries: any[][], context?: string) {
    const res = entries.map(([key, value]) => {
      const validatedKey = this.keyType.validate(
        key,
        toContext(context, String(key))
      );
      const validatedValue = this.valueType.validate(
        value,
        toContext(context, String(key))
      );

      return [validatedKey, validatedValue] as [K, V];
    });

    return new Map(res);
  }
}

export function mapOf<K, V>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: MapOfOptions<K, V>
): Type<Map<K, V>> {
  return new MapOfType(keyType, valueType, options);
}
