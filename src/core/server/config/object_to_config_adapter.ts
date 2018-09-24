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

import { cloneDeep, get, has, set } from 'lodash';

import { Config, ConfigPath } from './';

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
    return [...flattenObjectKeys(this.rawConfig)];
  }

  public toRaw() {
    return cloneDeep(this.rawConfig);
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
