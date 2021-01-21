/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPattern, IFieldType } from 'src/plugins/data/public';
import { SimpleSavedObject } from 'src/core/public';
import { IndexPatternListConfig, IndexPatternTag } from './config';

export class IndexPatternListManager {
  private configs: IndexPatternListConfig[] = [];

  setup() {
    return {
      addListConfig: (Config: typeof IndexPatternListConfig) => {
        const config = new Config();

        if (this.configs.findIndex((c) => c.key === config.key) !== -1) {
          throw new Error(`${config.key} exists in IndexPatternListManager.`);
        }
        this.configs.push(config);
      },
    };
  }

  start() {
    return {
      getIndexPatternTags: (
        indexPattern: IIndexPattern | SimpleSavedObject<IIndexPattern>,
        isDefault: boolean
      ) =>
        this.configs.reduce(
          (tags: IndexPatternTag[], config) =>
            config.getIndexPatternTags
              ? tags.concat(config.getIndexPatternTags(indexPattern, isDefault))
              : tags,
          []
        ),

      getFieldInfo: (indexPattern: IIndexPattern, field: IFieldType): string[] =>
        this.configs.reduce(
          (info: string[], config) =>
            config.getFieldInfo ? info.concat(config.getFieldInfo(indexPattern, field)) : info,
          []
        ),

      areScriptedFieldsEnabled: (indexPattern: IIndexPattern): boolean =>
        this.configs.every((config) =>
          config.areScriptedFieldsEnabled ? config.areScriptedFieldsEnabled(indexPattern) : true
        ),
    };
  }
}
