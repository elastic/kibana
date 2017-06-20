import { BehaviorSubject, Observable } from 'rxjs';
import { get, isEqual } from 'lodash';

import { getConfigFromFile } from './readConfig';
import { applyArgv } from './applyArgv';
import { Env } from './Env';
import { Logger, LoggerFactory } from '../logger';
import * as schema from '../lib/schema';
import { ConfigWithSchema } from '../types';

interface RawConfig {
  [key: string]: any
};

type ConfigPath = string | string[];

export class ConfigService {
  /**
   * The stream of configs read from the config file. Will only be `undefined`
   * before the config is initially read. This is the _raw_ config before any
   * argv or similar is applied.
   *
   * As we have a notion of a _current_ config we rely on a BehaviorSubject so
   * every new subscription will immediately receive the current config.
   */
  private readonly rawConfigFromFile$: BehaviorSubject<RawConfig | void> =
    new BehaviorSubject(undefined)

  private readonly config$: Observable<RawConfig>;
  private readonly log: Logger;

  /**
   * Whenever a config if read at a path, we mark that path as 'handled'. We can
   * then list all unhandled config paths when the startup process is completed.
   */
  private readonly handledPaths: ConfigPath[] = [];

  constructor(
    private readonly argv: {[key: string]: any},
    readonly env: Env,
    logger: LoggerFactory
  ) {
    this.log = logger.get('config');

    this.config$ = this.rawConfigFromFile$
      .filter(rawConfig => rawConfig !== undefined)
      // Now we _know_ `RawConfig` can no longer be `undefined`, but we can't
      // express that with TS types yet, so below we just _tell_ TS that it is
      // guaranteed to no longer be `undefined`.
      .map<RawConfig | void, RawConfig>(rawConfig => rawConfig!)
      // We only want to update the config if there are changes to it
      .distinctUntilChanged((current, next) => isEqual(current, next))
      .map(rawConfig => applyArgv(argv, rawConfig));
  }

  /**
   * Read the initial Kibana config.
   */
  start() {
    this.loadConfig();
  }

  /**
   * Re-read the Kibana config.
   */
  reloadConfig() {
    this.log.info('reloading config');
    this.loadConfig();
    this.log.info('reloading config done');
  }

  /**
   * Load the config by reading the raw config from the file system.
   */
  private loadConfig() {
    const config = getConfigFromFile(this.argv.config, this.env.getDefaultConfigFile());
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
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return this.getDistinctRawConfig(path)
      .map(rawConfig => this.createConfig(rawConfig, ConfigClass));
  }

  /**
   * Same as `atPath`, but returns `undefined` if there is no config at the
   * specified path.
   *
   * @see atPath
   */
  optionalAtPath<Schema extends schema.Any, Config>(
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return this.getDistinctRawConfig(path)
      .map(rawConfig =>
        rawConfig === undefined
          ? undefined
          : this.createConfig(rawConfig, ConfigClass)
      );
  }

  private createConfig<Schema extends schema.Any, Config>(
    rawConfig: {},
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    const config = ConfigClass.createSchema(schema).validate(rawConfig);
    return new ConfigClass(config, this.env);
  }

  private getDistinctRawConfig(path: ConfigPath) {
    this.handledPaths.push(path);

    return this.config$
      .map(config => get(config, path))
      .distinctUntilChanged((prev, next) => isEqual(prev, next))
  }

  async getUnusedPaths(): Promise<string[]> {
    const config = await this.config$.first().toPromise();
    const flatConfigPaths: string[] = [...flattenObject(config)].map(obj => obj.key);
    const handledPaths = this.handledPaths.map(pathToString);

    return flatConfigPaths.filter(path =>
      !isPathHandled(path, handledPaths)
    );
  }
}

const pathToString = (path: ConfigPath) =>
  Array.isArray(path)
    ? path.join('.')
    : path;

/**
 * A path is considered 'handled' if it is a subset of any of the already
 * handled paths.
 */
const isPathHandled = (path: string, handledPaths: string[]) =>
  handledPaths.some(handledPath => path.startsWith(handledPath));

function* flattenObject(obj: { [key: string]: any }, accKey?: string): any {
  if (typeof obj !== 'object') {
    yield { key: accKey, value: obj };
  } else {
    for (const key in obj) {
      yield *flattenObject(obj[key], (accKey ? accKey + '.' : '') + key);
    }
  }
}
