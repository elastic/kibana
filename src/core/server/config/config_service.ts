/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { isEqual } from 'lodash';
import { first, k$, map, Observable, skipRepeats, toPromise } from '../../lib/kbn_observable';

import { Logger, LoggerFactory } from '../logging';
import { ConfigWithSchema } from './config_with_schema';
import { Env } from './env';
import { RawConfig } from './raw_config';
import { AnyType } from './schema';

export type ConfigPath = string | string[];

export class ConfigService {
  private readonly log: Logger;

  /**
   * Whenever a config if read at a path, we mark that path as 'handled'. We can
   * then list all unhandled config paths when the startup process is completed.
   */
  private readonly handledPaths: ConfigPath[] = [];

  constructor(
    private readonly config$: Observable<RawConfig>,
    readonly env: Env,
    logger: LoggerFactory
  ) {
    this.log = logger.get('config');
  }

  /**
   * Returns the full config object observable. This is not intended for
   * "normal use", but for features that _need_ access to the full object.
   */
  public getConfig$() {
    return this.config$;
  }

  /**
   * Reads the subset of the config at the specified `path` and validates it
   * against the static `schema` on the given `ConfigClass`.
   *
   * @param path The path to the desired subset of the config.
   * @param ConfigClass A class (not an instance of a class) that contains a
   * static `schema` that we validate the config at the given `path` against.
   */
  public atPath<Schema extends AnyType, Config>(
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return k$(this.getDistinctRawConfig(path))(
      map(rawConfig => this.createConfig(path, rawConfig, ConfigClass))
    );
  }

  /**
   * Same as `atPath`, but returns `undefined` if there is no config at the
   * specified path.
   *
   * @see atPath
   */
  public optionalAtPath<Schema extends AnyType, Config>(
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    return k$(this.getDistinctRawConfig(path))(
      map(
        rawConfig =>
          rawConfig === undefined ? undefined : this.createConfig(path, rawConfig, ConfigClass)
      )
    );
  }

  public async isEnabledAtPath(path: ConfigPath) {
    const enabledPath = createPluginEnabledPath(path);

    const config = await k$(this.config$)(first(), toPromise());

    if (!config.has(enabledPath)) {
      return true;
    }

    const isEnabled = config.get(enabledPath);

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

  public async getUnusedPaths(): Promise<string[]> {
    const config = await k$(this.config$)(first(), toPromise());
    const handledPaths = this.handledPaths.map(pathToString);

    return config.getFlattenedPaths().filter(path => !isPathHandled(path, handledPaths));
  }

  private createConfig<Schema extends AnyType, Config>(
    path: ConfigPath,
    rawConfig: {},
    ConfigClass: ConfigWithSchema<Schema, Config>
  ) {
    const namespace = Array.isArray(path) ? path.join('.') : path;

    const configSchema = ConfigClass.schema;

    if (configSchema === undefined || typeof configSchema.validate !== 'function') {
      throw new Error(
        `The config class [${
          ConfigClass.name
        }] did not contain a static 'schema' field, which is required when creating a config instance`
      );
    }

    const environmentMode = this.env.getMode();
    const config = ConfigClass.schema.validate(
      rawConfig,
      {
        dev: environmentMode.dev,
        prod: environmentMode.prod,
        ...this.env.getPackageInfo(),
      },
      namespace
    );
    return new ConfigClass(config, this.env);
  }

  private getDistinctRawConfig(path: ConfigPath) {
    this.markAsHandled(path);

    return k$(this.config$)(map(config => config.get(path)), skipRepeats(isEqual));
  }

  private markAsHandled(path: ConfigPath) {
    this.log.debug(`Marking config path as handled: ${path}`);
    this.handledPaths.push(path);
  }
}

const createPluginEnabledPath = (configPath: string | string[]) => {
  if (Array.isArray(configPath)) {
    return configPath.concat('enabled');
  }
  return `${configPath}.enabled`;
};

const pathToString = (path: ConfigPath) => (Array.isArray(path) ? path.join('.') : path);

/**
 * A path is considered 'handled' if it is a subset of any of the already
 * handled paths.
 */
const isPathHandled = (path: string, handledPaths: string[]) =>
  handledPaths.some(handledPath => path.startsWith(handledPath));
