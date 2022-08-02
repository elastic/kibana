/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, get, has } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { getFlattenedObject } from '@kbn/std';

import { Config, ConfigPath } from '.';

/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export class ObjectToConfigAdapter implements Config {
  constructor(private readonly rawConfig: Record<string, any>) {}

  public has(configPath: ConfigPath) {
    return has(this.rawConfig, configPath);
  }

  public get(configPath: ConfigPath) {
    return get(this.rawConfig, configPath);
  }

  public set(configPath: ConfigPath, value: any) {
    set(this.rawConfig, configPath, value);
  }

  public getFlattenedPaths() {
    return Object.keys(getFlattenedObject(this.rawConfig));
  }

  public toRaw() {
    return cloneDeep(this.rawConfig);
  }
}
