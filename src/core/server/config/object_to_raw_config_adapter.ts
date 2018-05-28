import { get, has, set } from 'lodash';

import { ConfigPath } from './config_service';
import { RawConfig } from './raw_config';

/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export class ObjectToRawConfigAdapter implements RawConfig {
  constructor(private readonly rawValue: { [key: string]: any }) {}

  public has(configPath: ConfigPath) {
    return has(this.rawValue, configPath);
  }

  public get(configPath: ConfigPath) {
    return get(this.rawValue, configPath);
  }

  public set(configPath: ConfigPath, value: any) {
    set(this.rawValue, configPath, value);
  }

  public getFlattenedPaths() {
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
