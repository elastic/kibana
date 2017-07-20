import { Observable } from 'rxjs';
import { get, isEqual } from 'lodash';

import { Env } from './Env';
import { Logger, LoggerFactory } from '../logger';
import * as schema from '../lib/schema';
import { ConfigWithSchema } from './ConfigWithSchema';

export type ConfigPath = string | string[];

export class ConfigService {
  private readonly log: Logger;

  /**
   * Whenever a config if read at a path, we mark that path as 'handled'. We can
   * then list all unhandled config paths when the startup process is completed.
   */
  private readonly handledPaths: ConfigPath[] = [];

  constructor(
    private readonly config$: Observable<{ [key: string]: any }>,
    readonly env: Env,
    logger: LoggerFactory
  ) {
    this.log = logger.get('config');
  }

  /**
   * Returns the full config object observable. This is not intended for
   * "normal use", but for features that _need_ access to the full object.
   */
  getConfig$() {
    return this.config$;
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
    return this.getDistinctRawConfig(path).map(rawConfig =>
      this.createConfig(rawConfig, ConfigClass)
    );
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
    return this.getDistinctRawConfig(path).map(
      rawConfig =>
        rawConfig === undefined
          ? undefined
          : this.createConfig(rawConfig, ConfigClass)
    );
  }

  async isEnabledAtPath(path: ConfigPath) {
    const enabledPath = createPluginEnabledPath(path);

    const isEnabled = await this.config$
      .map(config => get(config, enabledPath))
      .first()
      .toPromise();

    if (isEnabled === false) {
      // If the plugin is _not_ enabled, we mark the entire plugin path as
      // handled, as it's expected that it won't be used.
      this.markAsHandled(path);
      return false;
    }

    // If plugin enabled we mark the enabled path as handled, as we for example
    // can have plugins that don't have _any_ config except for this field, and
    // therefore have no reason to try to get the config.
    this.markAsHandled(enabledPath);
    return true;
  }

  private createConfig<Schema extends schema.Any, Config>(
    rawConfig: {},
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    const config = ConfigClass.createSchema(schema).validate(rawConfig);
    return new ConfigClass(config, this.env);
  }

  private getDistinctRawConfig(path: ConfigPath) {
    this.markAsHandled(path);

    return this.config$
      .map(config => get(config, path))
      .distinctUntilChanged((prev, next) => isEqual(prev, next));
  }

  private markAsHandled(path: ConfigPath) {
    this.handledPaths.push(path);
  }

  async getUnusedPaths(): Promise<string[]> {
    const config = await this.config$.first().toPromise();
    const flatConfigPaths = [...flattenObject(config)].map(obj => obj.key);
    const handledPaths = this.handledPaths.map(pathToString);

    return flatConfigPaths.filter(path => !isPathHandled(path, handledPaths));
  }
}

const createPluginEnabledPath = (configPath: string | string[]) => {
  if (Array.isArray(configPath)) {
    return configPath.concat('enabled');
  }
  return `${configPath}.enabled`;
};

const pathToString = (path: ConfigPath) =>
  Array.isArray(path) ? path.join('.') : path;

/**
 * A path is considered 'handled' if it is a subset of any of the already
 * handled paths.
 */
const isPathHandled = (path: string, handledPaths: string[]) =>
  handledPaths.some(handledPath => path.startsWith(handledPath));

function* flattenObject(
  obj: { [key: string]: any },
  accKey: string = ''
): IterableIterator<{ key: string; value: any }> {
  if (typeof obj !== 'object') {
    yield { key: accKey, value: obj };
  } else {
    for (const key in obj) {
      yield* flattenObject(obj[key], (accKey !== '' ? accKey + '.' : '') + key);
    }
  }
}
