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
}
