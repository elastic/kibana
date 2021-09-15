/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from 'kibana/server';
import { CustomIntegration } from './types';

export interface CategoryCount {
  count: number;
  id: string;
}

function isAddable(integration: CustomIntegration) {
  return !integration.isBeats && !integration.isAPM;
}

export class CustomIntegrationRegistry {
  private readonly _integrations: CustomIntegration[];
  private readonly _logger: Logger;

  constructor(logger: Logger) {
    this._integrations = [];
    this._logger = logger;
  }

  registerCustomIntegration(customIntegration: CustomIntegration) {
    if (
      this._integrations.some((integration: CustomIntegration) => {
        return integration.name === customIntegration.name;
      })
    ) {
      this._logger.error(`Integration with id=${customIntegration.name} already exists.`);
      return;
    }

    this._integrations.push(customIntegration);
  }

  getAddableCustomIntegrations(): CustomIntegration[] {
    return this._integrations.filter(isAddable);
  }

  getReplaceableCustomIntegrations(): CustomIntegration[] {
    return this._integrations.filter((integration) => integration.isBeats);
  }

  getAddableCategories(): CategoryCount[] {
    const categories: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < this._integrations.length; i++) {
      if (!isAddable(this._integrations[i])) {
        continue;
      }
      for (let j = 0; j < this._integrations[i].categories.length; j++) {
        const category = this._integrations[i].categories[j];
        if (categories.has(category)) {
          // @ts-ignore
          categories.set(category, categories.get(category) + 1);
        } else {
          categories.set(category, 1);
        }
      }
    }

    const list: CategoryCount[] = [];
    categories.forEach((value, key) => {
      list.push({
        count: value,
        id: key,
      });
    });
    return list;
  }
}
