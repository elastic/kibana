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

/**
 * This is a partial mock of src/server/config/config.js.
 */
export class LegacyConfigMock {
  public readonly set = jest.fn((key, value) => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    this.rawData.set(key, value);
  });

  public readonly get = jest.fn(key => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    return this.rawData.get(key);
  });

  public readonly has = jest.fn(key => this.rawData.has(key));

  constructor(public rawData: Map<string, any> = new Map()) {}
}
