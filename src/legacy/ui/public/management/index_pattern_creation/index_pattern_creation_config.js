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

import { i18n } from '@kbn/i18n';

const indexPatternTypeName = i18n.translate(
  'common.ui.management.editIndexPattern.createIndex.defaultTypeName',
  { defaultMessage: 'index pattern' }
);

const indexPatternButtonText = i18n.translate(
  'common.ui.management.editIndexPattern.createIndex.defaultButtonText',
  { defaultMessage: 'Standard index pattern' }
);

const indexPatternButtonDescription = i18n.translate(
  'common.ui.management.editIndexPattern.createIndex.defaultButtonDescription',
  { defaultMessage: 'Perform full aggregations against any data' }
);

export class IndexPatternCreationConfig {
  static key = 'default';

  constructor({
    type = undefined,
    name = indexPatternTypeName,
    showSystemIndices = true,
    httpClient = null,
    isBeta = false,
  }) {
    this.type = type;
    this.name = name;
    this.showSystemIndices = showSystemIndices;
    this.httpClient = httpClient;
    this.isBeta = isBeta;
  }

  async getIndexPatternCreationOption(urlHandler) {
    return {
      text: indexPatternButtonText,
      description: indexPatternButtonDescription,
      testSubj: `createStandardIndexPatternButton`,
      onClick: () => {
        urlHandler('/management/kibana/index_pattern');
      },
    };
  }

  getIndexPatternType = () => {
    return this.type;
  };

  getIndexPatternName = () => {
    return this.name;
  };

  getIsBeta = () => {
    return this.isBeta;
  };

  getShowSystemIndices = () => {
    return this.showSystemIndices;
  };

  getIndexTags() {
    return [];
  }

  checkIndicesForErrors = () => {
    return undefined;
  };

  getIndexPatternMappings = () => {
    return {};
  };

  renderPrompt = () => {
    return null;
  };

  getFetchForWildcardOptions = () => {
    return {};
  };
}
