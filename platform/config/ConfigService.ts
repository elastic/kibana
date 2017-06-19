import { BehaviorSubject, Observable } from 'rxjs';
import { get, isEqual, omit } from 'lodash';

import { getRawConfig } from './readConfig';
import { applyArgv } from './applyArgv';
import { Env } from '../env';
import { Logger, LoggerFactory } from '../logger';
import * as schema from '../lib/schema';
import { ConfigWithSchema } from '../types';

interface RawConfig {
  [key: string]: any
};

export class ConfigService {
  // We rely on a BehaviorSubject as we want every subscriber to immediately
  // receive the current config when subscribing, aka we have a notion of a
  // _current_ config.
  private readonly rawConfigFromFile$: BehaviorSubject<RawConfig | void> =
    new BehaviorSubject(undefined)

  private readonly rawConfig$: Observable<RawConfig>;
  private readonly log: Logger;

  /**
   * Whenever a config if read at a path, we mark that path as handled. We can
   * then notify about unhandled config paths when the entire startup process
   * is completed.
   */
  private readonly handledPaths: (string|string[])[] = [];

  constructor(
    private readonly argv: {[key: string]: any},
    readonly env: Env,
    logger: LoggerFactory
  ) {
    this.log = logger.get('config');

    this.rawConfig$ = this.rawConfigFromFile$
      .filter(rawConfig => rawConfig !== undefined)
      // We _know_ `RawConfig` can no longer be `undefined`, but it can't be
      // expressed with TS types yet, so below we just _tell_ TS that it is
      // guaranteed to no longer be `undefined`.
      .map<RawConfig | void, RawConfig>(rawConfig => rawConfig!)
      .map(rawConfig => applyArgv(argv, rawConfig))
      // we only care about reloading the config if there are changes
      .distinctUntilChanged((prev, next) => isEqual(prev, next));
  }

  /**
   * Reads the initial Kibana config.
   */
  start() {
    this.loadConfig();
  }

  /**
   * Re-reads the Kibana config.
   */
  reloadConfig() {
    this.log.info('reloading config');
    this.loadConfig();
    this.log.info('reloading config done');
  }

  /**
   * Loads the config by reading the raw config from the file system.
   */
  private loadConfig() {
    const config = getRawConfig(this.argv.config, this.env.getDefaultConfigFile());
    this.rawConfigFromFile$.next(config);
  }

  stop() {
    this.rawConfigFromFile$.complete();
  }

  /**
   * Reads the subset of the config at the specified `path` and validates it
   * against the schema created by calling the static `createSchema` on the
   * specified `ConfigClass`.
   *
   * @param path The path to the desired subset of the config.
   * @param ConfigClass A class (not an instance of a class) that contains a
   *                    static `createSchema` that will be called to create a
   *                    schema that we validate the config at the given `path`
   *                    against.
   */
  atPath<Schema extends schema.Any, Config>(
    path: string | string[],
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return this.getDistinctRawConfig(path)
      .map(value => {
        const config = ConfigClass.createSchema(schema).validate(value);
        return new ConfigClass(config, this.env);
      });
  }

  optionalAtPath<Schema extends schema.Any, Config>(
    path: string | string[],
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return this.getDistinctRawConfig(path)
      .map(value => {
        const config = schema.maybe(ConfigClass.createSchema(schema)).validate(value);

        if (config === undefined) {
          return undefined;
        }

        return new ConfigClass(config, this.env);
      });
  }

  private getDistinctRawConfig(path: string | string[]) {
    this.handledPaths.push(path);

    return this.rawConfig$
      .map(config => get(config, path))
      .distinctUntilChanged((prev, next) => isEqual(prev, next))
  }

  async getUnusedPaths(): Promise<string[]> {
    const config = await this.rawConfig$.first().toPromise();
    const unhandledConfigValues = omit(config, this.handledPaths);
    return [...flattenObject(unhandledConfigValues)].map(obj => obj.key);
  }
}

function* flattenObject(obj: { [key: string]: any }, accKey?: string): any {
  if (typeof obj !== 'object') {
    yield { key: accKey, value: obj };
  } else {
    for (const key in obj) {
      yield *flattenObject(obj[key], (accKey ? accKey + '.' : '') + key);
    }
  }
}
