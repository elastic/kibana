/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { once } from 'lodash';
import { CoreStart } from '../../../../../core/public';
import { IndexPatternListConfig, IndexPatternTag } from './config';
import { CONFIG_ROLLUPS } from '../../constants';
import { RollupIndexPatternListConfig } from './rollup_list_config';

interface IndexPatternListManagerStart {
  uiSettings: CoreStart['uiSettings'];
}

export class IndexPatternListManager {
  start({ uiSettings }: IndexPatternListManagerStart) {
    const getConfigs = once(() => {
      const configs: IndexPatternListConfig[] = [];
      configs.push(new IndexPatternListConfig());

      if (uiSettings.isDeclared(CONFIG_ROLLUPS) && uiSettings.get(CONFIG_ROLLUPS)) {
        configs.push(new RollupIndexPatternListConfig());
      }

      return configs;
    });
    return {
      getIndexPatternTags: (indexPattern: IndexPattern, isDefault: boolean) =>
        getConfigs().reduce(
          (tags: IndexPatternTag[], config) =>
            config.getIndexPatternTags
              ? tags.concat(config.getIndexPatternTags(indexPattern, isDefault))
              : tags,
          []
        ),

      getFieldInfo: (indexPattern: IndexPattern, field: IndexPatternField): string[] =>
        getConfigs().reduce(
          (info: string[], config) =>
            config.getFieldInfo ? info.concat(config.getFieldInfo(indexPattern, field)) : info,
          []
        ),

      areScriptedFieldsEnabled: (indexPattern: IndexPattern): boolean =>
        getConfigs().every((config) =>
          config.areScriptedFieldsEnabled ? config.areScriptedFieldsEnabled(indexPattern) : true
        ),
    };
  }
}
