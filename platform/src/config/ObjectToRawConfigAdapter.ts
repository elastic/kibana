import { has, get, set } from 'lodash';

import { RawConfig } from './RawConfig';
import { ConfigPath } from './ConfigService';

/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export class ObjectToRawConfigAdapter implements RawConfig {
  constructor(private readonly rawValue: { [key: string]: any }) {}

  has(configPath: ConfigPath) {
    return has(this.rawValue, configPath);
  }

  get(configPath: ConfigPath) {
    return get(this.rawValue, configPath);
  }

  set(configPath: ConfigPath, value: any) {
    set(this.rawValue, configPath, value);
  }

  getFlattenedPaths() {
    return [...flattenObjectKeys(this.rawValue)];
  }
}

function* flattenObjectKeys(
  obj: { [key: string]: any },
  path: string = ''
): IterableIterator<string> {
  if (typeof obj !== 'object' || obj === null) {
    yield path;
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path !== '' ? `${path}.${key}` : key;
      yield* flattenObjectKeys(value, newPath);
    }
  }
}
