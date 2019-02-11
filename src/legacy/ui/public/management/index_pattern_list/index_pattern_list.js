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

import { IndexPatternListConfigRegistry } from './index_pattern_list_config_registry';

class IndexPatternList {
  constructor(registry) {
    this._plugins = registry.inOrder.map(Plugin => new Plugin());
  }

  getIndexPatternTags = (indexPattern) => {
    return this._plugins.reduce((tags, plugin) => {
      return plugin.getIndexPatternTags ? tags.concat(plugin.getIndexPatternTags(indexPattern)) : tags;
    }, []);
  }

  getFieldInfo = (indexPattern, field) => {
    return this._plugins.reduce((info, plugin) => {
      return plugin.getFieldInfo ? info.concat(plugin.getFieldInfo(indexPattern, field)) : info;
    }, []);
  }

  areScriptedFieldsEnabled = (indexPattern) => {
    return this._plugins.every((plugin) => {
      return plugin.areScriptedFieldsEnabled ? plugin.areScriptedFieldsEnabled(indexPattern) : true;
    });
  }
}

export const IndexPatternListFactory = (Private) => {
  return function () {
    const indexPatternListRegistry = Private(IndexPatternListConfigRegistry);
    const indexPatternListProvider = new IndexPatternList(indexPatternListRegistry);
    return indexPatternListProvider;
  };
};
