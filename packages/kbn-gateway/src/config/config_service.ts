/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { firstValueFrom } from 'rxjs';
import { fromRoot } from '@kbn/utils';
import { RawConfigService, ConfigPath } from '@kbn/config';
import { Type } from '@kbn/config-schema';
import { getArgValues } from './read_argv';

const CONFIG_CLI_FLAGS = ['-c', '--config'];
const DEFAULT_CONFIG_PATH = fromRoot('config/gateway.yml');

const pathToString = (path: ConfigPath) => (Array.isArray(path) ? path.join('.') : path);

export interface ConfigStart {
  /** Signature borrowed from the method of the same name in core's own ConfigService. */
  atPathSync: <TSchema>(path: ConfigPath) => TSchema;
}

/**
 * A very simple service for loading configuration from a file, validating it,
 * and providing a means for other services to retrieve it.
 */
export class ConfigService {
  private readonly rawConfigService: RawConfigService;
  private readonly schemas = new Map<string, Type<unknown>>();
  private readonly validatedConfigs = new Map<string, unknown>();

  constructor() {
    const configPathOverride = getArgValues(process.argv, CONFIG_CLI_FLAGS);
    const configPath = configPathOverride.length ? configPathOverride : [DEFAULT_CONFIG_PATH];
    this.rawConfigService = new RawConfigService(configPath);
  }

  public setSchema(path: ConfigPath, schema: Type<unknown>) {
    const namespace = pathToString(path);
    if (this.schemas.has(namespace)) {
      throw new Error(`Validation schema for [${path}] was already registered`);
    }

    this.schemas.set(namespace, schema);
  }

  async start(): Promise<ConfigStart> {
    const config = (await this.loadConfig()) as Record<string, unknown>;

    // Validate and cache all configs.
    for (const namespace of this.schemas.keys()) {
      this.validateAtPath(namespace, config);
    }

    return {
      atPathSync: <TSchema>(path: ConfigPath): TSchema => {
        const namespace = pathToString(path);
        const validatedConfig = this.validatedConfigs.get(namespace);
        if (!validatedConfig) {
          throw new Error(`Validated config at path [${namespace}] does not exist`);
        }
        return validatedConfig as TSchema;
      },
    };
  }

  stop() {
    this.rawConfigService.stop();
  }

  private async loadConfig() {
    this.rawConfigService.loadConfig();
    // For now, we don't have a need to support config reloads.
    // So the config is just read once on startup.
    return await firstValueFrom(this.rawConfigService.getConfig$());
  }

  /**
   * Validates the provided config against the schema at the specified path.
   * As a side effect, this also caches the validated configs for use in
   * subsequent calls to `atPathSync`.
   */
  private validateAtPath(path: ConfigPath, config: unknown) {
    const namespace = pathToString(path);
    const schema = this.schemas.get(namespace);
    if (!schema) {
      throw new Error(`No validation schema has been defined for [${namespace}]`);
    }
    const validated = schema.validate(get(config, namespace));
    this.validatedConfigs.set(namespace, validated);
    return validated;
  }
}
