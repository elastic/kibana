/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternField, IndexPatternType } from '../../../../data/public';

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
  public readonly key: IndexPatternType = IndexPatternType.DEFAULT;

  public getIndexPatternTags(indexPattern: IndexPattern, isDefault: boolean): IndexPatternTag[] {
    return isDefault
      ? [
          {
            key: 'default',
            name: defaultIndexPatternListName,
          },
        ]
      : [];
  }

  public getFieldInfo(indexPattern: IndexPattern, field: IndexPatternField): string[] {
    return [];
  }

  public areScriptedFieldsEnabled(indexPattern: IndexPattern): boolean {
    return true;
  }
}
