/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { HttpStart, CoreStart } from '../../../../../core/public';
import { IndexPatternCreationConfig, UrlHandler, IndexPatternCreationOption } from './config';
import { CONFIG_ROLLUPS } from '../../constants';
// @ts-ignore
import { RollupIndexPatternCreationConfig } from './rollup_creation_config';

interface IndexPatternCreationManagerStart {
  httpClient: HttpStart;
  uiSettings: CoreStart['uiSettings'];
}

export class IndexPatternCreationManager {
  start({ httpClient, uiSettings }: IndexPatternCreationManagerStart) {
    const getConfigs = once(() => {
      const configs: IndexPatternCreationConfig[] = [];
      configs.push(new IndexPatternCreationConfig({ httpClient }));

      if (uiSettings.isDeclared(CONFIG_ROLLUPS) && uiSettings.get(CONFIG_ROLLUPS)) {
        configs.push(new RollupIndexPatternCreationConfig({ httpClient }));
      }

      return configs;
    });

    const getType = (key: string | undefined): IndexPatternCreationConfig => {
      const configs = getConfigs();
      if (key) {
        const index = configs.findIndex((config) => config.key === key);
        const config = configs[index];

        if (config) {
          return config;
        } else {
          throw new Error(`Index pattern creation type not found: ${key}`);
        }
      } else {
        return getType('default');
      }
    };

    return {
      getType,
      getIndexPatternCreationOptions: async (urlHandler: UrlHandler) => {
        const options: IndexPatternCreationOption[] = [];

        await Promise.all(
          getConfigs().map(async (config) => {
            const option = config.getIndexPatternCreationOption
              ? await config.getIndexPatternCreationOption(urlHandler)
              : null;
            if (option) {
              options.push(option);
            }
          })
        );

        return options;
      },
    };
  }
}
