/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';
import { IntegrationCategory, INTEGRATION_CATEGORY_DISPLAY, CustomIntegration } from '../common';

function isAddable(integration: CustomIntegration): boolean {
  return !!integration.categories.length && !integration.eprOverlap;
}

function isReplacement(integration: CustomIntegration): boolean {
  return !!integration.categories.length && !!integration.eprOverlap;
}

export class CustomIntegrationRegistry {
  private readonly _integrations: CustomIntegration[];
  private readonly _logger: Logger;
  private readonly _isDev: boolean;

  constructor(logger: Logger, isDev: boolean) {
    this._integrations = [];
    this._logger = logger;
    this._isDev = isDev;
  }

  registerCustomIntegration(customIntegration: CustomIntegration) {
    if (
      this._integrations.some((integration: CustomIntegration) => {
        return integration.id === customIntegration.id;
      })
    ) {
      const message = `Integration with id=${customIntegration.id} already exists.`;
      if (this._isDev) {
        this._logger.error(message);
      } else {
        this._logger.debug(message);
      }
      return;
    }

    const allowedCategories: IntegrationCategory[] = (customIntegration.categories ?? []).filter(
      (category) => {
        return INTEGRATION_CATEGORY_DISPLAY.hasOwnProperty(category);
      }
    ) as IntegrationCategory[];

    this._integrations.push({ ...customIntegration, categories: allowedCategories });
  }

  getAppendCustomIntegrations(): CustomIntegration[] {
    return this._integrations.filter(isAddable);
  }

  getReplacementCustomIntegrations(): CustomIntegration[] {
    return this._integrations.filter(isReplacement);
  }
}
