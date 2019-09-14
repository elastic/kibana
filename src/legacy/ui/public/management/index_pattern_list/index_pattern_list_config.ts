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

export interface IndexPatternTag {
  key: string;
  name: string;
}

export class IndexPatternListConfig {
  static key = 'default';

  getIndexPatternTags = (indexPattern: any, isDefault: boolean): IndexPatternTag[] => {
    return isDefault
      ? [
          {
            key: 'default',
            name: i18n.translate(
              'common.ui.management.editIndexPattern.list.defaultIndexPatternListName',
              { defaultMessage: 'Default' }
            ),
          },
        ]
      : [];
  };

  getFieldInfo = (indexPattern: any, field: any): string[] => {
    return [];
  };

  areScriptedFieldsEnabled = (indexPattern: any): boolean => {
    return true;
  };
}

type IndexPatternListConfigType = typeof IndexPatternListConfig;

export const indexPatternListConfigs: IndexPatternListConfigType[] = [];
export const addIndexPatternListConfig = (config: IndexPatternListConfigType) =>
  indexPatternListConfigs.push(config);
