/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IIndexPattern, IFieldType } from 'src/plugins/data/public';
import { SimpleSavedObject } from 'src/core/public';
import { memoize } from 'lodash';
import { CoreStart } from '../../../../../core/public';
import { IndexPatternListConfig, IndexPatternTag } from './config';
import { CONFIG_ROLLUPS } from '../../constants';
// @ts-ignore
import { RollupIndexPatternListConfig } from './rollup_list_config';

interface IndexPatternListManagerStart {
  uiSettings: CoreStart['uiSettings'];
}

export class IndexPatternListManager {
  start({ uiSettings }: IndexPatternListManagerStart) {
    const getConfigs = memoize(() => {
      const configs: IndexPatternListConfig[] = [];
      configs.push(new IndexPatternListConfig());

      if (uiSettings.get(CONFIG_ROLLUPS, false)) {
        configs.push(new RollupIndexPatternListConfig());
      }

      return configs;
    });
    return {
      getIndexPatternTags: (
        indexPattern: IIndexPattern | SimpleSavedObject<IIndexPattern>,
        isDefault: boolean
      ) =>
        getConfigs().reduce(
          (tags: IndexPatternTag[], config) =>
            config.getIndexPatternTags
              ? tags.concat(config.getIndexPatternTags(indexPattern, isDefault))
              : tags,
          []
        ),

      getFieldInfo: (indexPattern: IIndexPattern, field: IFieldType): string[] =>
        getConfigs().reduce(
          (info: string[], config) =>
            config.getFieldInfo ? info.concat(config.getFieldInfo(indexPattern, field)) : info,
          []
        ),

      areScriptedFieldsEnabled: (indexPattern: IIndexPattern): boolean =>
        getConfigs().every((config) =>
          config.areScriptedFieldsEnabled ? config.areScriptedFieldsEnabled(indexPattern) : true
        ),
    };
  }
}
