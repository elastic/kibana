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
import { IIndexPattern, IFieldType } from 'src/plugins/data/public';
import { SimpleSavedObject } from 'src/core/public';

export interface IndexPatternTag {
  key: string;
  name: string;
}

const defaultIndexPatternListName = i18n.translate(
  'indexPatternManagement.editIndexPattern.list.defaultIndexPatternListName',
  {
    defaultMessage: 'Default',
  }
);

export class IndexPatternListConfig {
  public readonly key = 'default';

  public getIndexPatternTags(
    indexPattern: IIndexPattern | SimpleSavedObject<IIndexPattern>,
    isDefault: boolean
  ): IndexPatternTag[] {
    return isDefault
      ? [
          {
            key: 'default',
            name: defaultIndexPatternListName,
          },
        ]
      : [];
  }

  public getFieldInfo(indexPattern: IIndexPattern, field: IFieldType): string[] {
    return [];
  }

  public areScriptedFieldsEnabled(indexPattern: IIndexPattern): boolean {
    return true;
  }
}
