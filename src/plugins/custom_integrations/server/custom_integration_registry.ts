/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from 'kibana/server';
import { CustomIntegration } from '../common';

function isAddable(integration: CustomIntegration) {
  return integration.categories.length;
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
        return integration.name === customIntegration.name;
      })
    ) {
      const message = `Integration with id=${customIntegration.name} already exists.`;
      if (this._isDev) {
        this._logger.debug(message);
      } else {
        this._logger.debug(message);
      }
      return;
    }

    this._integrations.push(customIntegration);
  }

  getAddableCustomIntegrations(): CustomIntegration[] {
    return this._integrations.filter(isAddable);
  }
}
