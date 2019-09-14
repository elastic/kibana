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

import {
  indexPatternListConfigs,
  IndexPatternListConfig,
  IndexPatternTag,
} from './index_pattern_list_config';

class IndexPatternList {
  private _plugins: IndexPatternListConfig[];

  constructor() {
    this._plugins = indexPatternListConfigs.map(Plugin => new Plugin());
  }

  getIndexPatternTags = (indexPattern: any, isDefault: boolean) => {
    return this._plugins.reduce((tags: IndexPatternTag[], plugin) => {
      return plugin.getIndexPatternTags
        ? tags.concat(plugin.getIndexPatternTags(indexPattern, isDefault))
        : tags;
    }, []);
  };

  getFieldInfo = (indexPattern: any, field: any): string[] => {
    return this._plugins.reduce((info: string[], plugin) => {
      return plugin.getFieldInfo ? info.concat(plugin.getFieldInfo(indexPattern, field)) : info;
    }, []);
  };

  areScriptedFieldsEnabled = (indexPattern: any): boolean => {
    return this._plugins.every(plugin => {
      return plugin.areScriptedFieldsEnabled ? plugin.areScriptedFieldsEnabled(indexPattern) : true;
    });
  };
}

export const IndexPatternListFactory = () => {
  return () => new IndexPatternList();
};
