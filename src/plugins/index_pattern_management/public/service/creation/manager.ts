/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpSetup } from '../../../../../core/public';
import { IndexPatternCreationConfig, UrlHandler, IndexPatternCreationOption } from './config';

export class IndexPatternCreationManager {
  private configs: IndexPatternCreationConfig[] = [];

  setup(httpClient: HttpSetup) {
    return {
      addCreationConfig: (Config: typeof IndexPatternCreationConfig) => {
        const config = new Config({ httpClient });

        if (this.configs.findIndex((c) => c.key === config.key) !== -1) {
          throw new Error(`${config.key} exists in IndexPatternCreationManager.`);
        }

        this.configs.push(config);
      },
    };
  }

  start() {
    const getType = (key: string | undefined): IndexPatternCreationConfig => {
      if (key) {
        const index = this.configs.findIndex((config) => config.key === key);
        const config = this.configs[index];

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
          this.configs.map(async (config) => {
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
