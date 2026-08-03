/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { IntegrationCategory, CustomIntegration } from '../common';
import { INTEGRATION_CATEGORY_DISPLAY } from '../common';

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
  /**
   * Deferred initializers registered via {@link registerDeferredInitializer}.  They are
   * called (in order, exactly once) the first time the integration list is read, so that
   * callers can avoid executing expensive work (e.g. evaluating i18n strings) at plugin
   * start time.
   */
  private readonly _deferredInitializers: Array<() => void> = [];

  constructor(logger: Logger, isDev: boolean) {
    this._integrations = [];
    this._logger = logger;
    this._isDev = isDev;
  }

  registerDeferredInitializer(init: () => void) {
    this._deferredInitializers.push(init);
  }

  private _materializeDeferredInitializers() {
    while (this._deferredInitializers.length > 0) {
      this._deferredInitializers.shift()!();
    }
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
        return Object.hasOwn(INTEGRATION_CATEGORY_DISPLAY, category);
      }
    ) as IntegrationCategory[];

    this._integrations.push({ ...customIntegration, categories: allowedCategories });
  }

  getAppendCustomIntegrations(): CustomIntegration[] {
    this._materializeDeferredInitializers();
    return this._integrations.filter(isAddable);
  }

  getReplacementCustomIntegrations(): CustomIntegration[] {
    this._materializeDeferredInitializers();
    return this._integrations.filter(isReplacement);
  }
}
