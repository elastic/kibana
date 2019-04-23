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

import { Type } from '@kbn/config-schema';
import { isEqual } from 'lodash';
import { Observable } from 'rxjs';
import { distinctUntilChanged, first, map } from 'rxjs/operators';

import { Config, ConfigPath, ConfigWithSchema, Env } from '.';
import { Logger, LoggerFactory } from '../logging';

/** @public */
export class ConfigService {
  private readonly log: Logger;

  /**
   * Whenever a config if read at a path, we mark that path as 'handled'. We can
   * then list all unhandled config paths when the startup process is completed.
   */
  private readonly handledPaths: ConfigPath[] = [];
  private readonly schemas = new Map<string, Type<any>>();

  constructor(
    private readonly config$: Observable<Config>,
    private readonly env: Env,
    logger: LoggerFactory,
    schemas: Map<ConfigPath, Type<any>> = new Map()
  ) {
    this.log = logger.get('config');
    for (const [path, schema] of schemas) {
      this.schemas.set(pathToString(path), schema);
    }
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
   * @param path - The path to the desired subset of the config.
   * @param ConfigClass - A class (not an instance of a class) that contains a
   * static `schema` that we validate the config at the given `path` against.
   */
  public atPath<TSchema extends Type<any>, TConfig>(
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<TSchema, TConfig>
  ) {
    return this.getValidatedConfig(path).pipe(
      map(config => this.createConfig(config, ConfigClass))
    );
  }

  /**
   * Same as `atPath`, but returns `undefined` if there is no config at the
   * specified path.
   *
   * {@link ConfigService.atPath}
   */
  public optionalAtPath<TSchema extends Type<any>, TConfig>(
    path: ConfigPath,
    ConfigClass: ConfigWithSchema<TSchema, TConfig>
  ) {
    return this.getDistinctConfig(path).pipe(
      map(config => (config === undefined ? undefined : this.createConfig(config, ConfigClass)))
    );
  }

  public async isEnabledAtPath(path: ConfigPath) {
    const enabledPath = createPluginEnabledPath(path);

    const config = await this.config$.pipe(first()).toPromise();
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

  public async getUnusedPaths() {
    const config = await this.config$.pipe(first()).toPromise();
    const handledPaths = this.handledPaths.map(pathToString);

    return config.getFlattenedPaths().filter(path => !isPathHandled(path, handledPaths));
  }

  public async getUsedPaths() {
    const config = await this.config$.pipe(first()).toPromise();
    const handledPaths = this.handledPaths.map(pathToString);

    return config.getFlattenedPaths().filter(path => isPathHandled(path, handledPaths));
  }

  public async validateAll() {
    for (const namespace of this.schemas.keys()) {
      await this.getValidatedConfig(namespace)
        .pipe(first())
        .toPromise();
    }
  }

  private validateConfig(path: ConfigPath, config: Record<string, any>) {
    const namespace = pathToString(path);
    const schema = this.schemas.get(namespace);
    if (!schema) {
      throw new Error(`No config validator defined for ${namespace}`);
    }
    const validatedConfig = schema.validate(
      config,
      {
        dev: this.env.mode.dev,
        prod: this.env.mode.prod,
        ...this.env.packageInfo,
      },
      namespace
    );

    return validatedConfig;
  }

  private createConfig<TSchema extends Type<any>, TConfig>(
    validatedConfig: Record<string, any>,
    ConfigClass: ConfigWithSchema<TSchema, TConfig>
  ) {
    return new ConfigClass(validatedConfig, this.env);
  }

  private getValidatedConfig(path: ConfigPath) {
    return this.getDistinctConfig(path).pipe(map(config => this.validateConfig(path, config)));
  }

  private getDistinctConfig(path: ConfigPath) {
    this.markAsHandled(path);

    return this.config$.pipe(
      map(config => config.get(path)),
      distinctUntilChanged(isEqual)
    );
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
