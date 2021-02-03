/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
