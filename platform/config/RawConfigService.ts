import { BehaviorSubject, Observable } from 'rxjs';
import { get, isEqual, isPlainObject, set } from 'lodash';
import typeDetect from 'type-detect';

import { ConfigPath } from './ConfigService';
import { getConfigFromFile } from './readConfig';

export interface RawConfig {
  get(configPath: ConfigPath): any;
  set(configPath: ConfigPath, value: any): void;
  getFlattenedPaths(): string[];
}

// Used to indicate that no config has been received yet
const notRead = Symbol('config not yet read');

export class RawConfigService {
  /**
   * The stream of configs read from the config file. Will be the symbol
   * `notRead` before the config is initially read, and after that it can
   * potentially be `null` for an empty yaml file.
   *
   * This is the _raw_ config before any overrides are applied.
   *
   * As we have a notion of a _current_ config we rely on a BehaviorSubject so
   * every new subscription will immediately receive the current config.
   */
  private readonly rawConfigFromFile$: BehaviorSubject<
    any
  > = new BehaviorSubject(notRead);

  private readonly config$: Observable<RawConfig>;

  constructor(readonly configFile: string) {
    this.config$ = this.rawConfigFromFile$
      .asObservable()
      .filter(rawConfig => rawConfig !== notRead)
      .map(rawConfig => {
        // If the raw config is null, e.g. if empty config file, we default to
        // an empty config
        if (rawConfig == null) {
          return new ObjectToRawConfigAdapter({});
        }

        if (isPlainObject(rawConfig)) {
          // TODO Make config consistent, e.g. handle dots in keys
          return new ObjectToRawConfigAdapter(rawConfig);
        }

        throw new Error(
          `the raw config must be an object, got [${typeDetect(rawConfig)}]`
        );
      })
      // We only want to update the config if there are changes to it
      .distinctUntilChanged((current, next) => isEqual(current, next));
  }

  /**
   * Read the initial Kibana config.
   */
  loadConfig() {
    const config = getConfigFromFile(this.configFile);
    this.rawConfigFromFile$.next(config);
  }

  stop() {
    this.rawConfigFromFile$.complete();
  }

  /**
   * Re-read the Kibana config.
   */
  reloadConfig() {
    this.loadConfig();
  }

  getConfig$() {
    return this.config$;
  }
}

/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export class ObjectToRawConfigAdapter implements RawConfig {
  constructor(private readonly rawValue: { [key: string]: any }) {}

  get(configPath: ConfigPath) {
    return get(this.rawValue, configPath);
  }

  set(configPath: ConfigPath, value: any) {
    set(this.rawValue, configPath, value);
  }

  getFlattenedPaths() {
    return [...ObjectToRawConfigAdapter.flattenObjectKeys(this.rawValue)];
  }

  private static *flattenObjectKeys(
    obj: { [key: string]: any },
    accKey: string = ''
  ): IterableIterator<string> {
    if (typeof obj !== 'object') {
      yield accKey;
    } else {
      for (const [key, value] of Object.entries(obj)) {
        yield* ObjectToRawConfigAdapter.flattenObjectKeys(
          value,
          (accKey !== '' ? accKey + '.' : '') + key
        );
      }
    }
  }
}
