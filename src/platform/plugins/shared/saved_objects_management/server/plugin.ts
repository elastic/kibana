/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}>
{
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup() {
    this.logger.debug('Setting up SavedObjectsManagement plugin');

    return {};
  }

  public start() {
    this.logger.debug('Starting up SavedObjectsManagement plugin');

    return {};
  }
}
