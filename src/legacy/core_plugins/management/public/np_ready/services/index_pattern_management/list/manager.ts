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

import { IIndexPattern, IFieldType } from 'src/plugins/data/public';
import { IndexPatternListConfig, IndexPatternTag } from './config';

export class IndexPatternListManager {
  private configs: IndexPatternListConfig[];

  constructor() {
    this.configs = [];
  }

  public add(Config: typeof IndexPatternListConfig) {
    const config = new Config();
    if (this.configs.findIndex(c => c.key === config.key) !== -1) {
      throw new Error(`${config.key} exists in IndexPatternListManager.`);
    }
    this.configs.push(config);
  }

  public getIndexPatternTags(indexPattern: IIndexPattern, isDefault: boolean) {
    return this.configs.reduce((tags: IndexPatternTag[], config) => {
      return config.getIndexPatternTags
        ? tags.concat(config.getIndexPatternTags(indexPattern, isDefault))
        : tags;
    }, []);
  }

  public getFieldInfo(indexPattern: IIndexPattern, field: IFieldType): string[] {
    return this.configs.reduce((info: string[], config) => {
      return config.getFieldInfo ? info.concat(config.getFieldInfo(indexPattern, field)) : info;
    }, []);
  }

  public areScriptedFieldsEnabled(indexPattern: IIndexPattern): boolean {
    return this.configs.every(config => {
      return config.areScriptedFieldsEnabled ? config.areScriptedFieldsEnabled(indexPattern) : true;
    });
  }
}
