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

import { IndexPatternCreationConfig } from './config';

export class IndexPatternCreationManager {
  private configs: IndexPatternCreationConfig[];

  constructor(private readonly httpClient: object) {
    this.configs = [];
  }

  public add(Config: typeof IndexPatternCreationConfig) {
    this.configs.push(new Config({ httpClient: this.httpClient }));
  }

  public getConfig(key: string) {
    const index = key ? this.configs.findIndex(config => config.key === key) : -1;
    return index > -1 && this.configs[index] ? this.configs[index] : null;
  }

  public async getIndexPatternCreationOptions(urlHandler: any) {
    const options: any[] = [];
    await Promise.all(
      this.configs.map(async config => {
        const option = config.getIndexPatternCreationOption
          ? await config.getIndexPatternCreationOption(urlHandler)
          : null;
        if (option) {
          options.push(option);
        }
      })
    );
    return options;
  }
}
