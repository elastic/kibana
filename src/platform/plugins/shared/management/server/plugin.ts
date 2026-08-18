/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { ManagementAppLocatorDefinition } from '../common/locator';
import { capabilitiesProvider } from './capabilities_provider';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ManagementServerPlugin extends Service {
  static readonly inject = ['core.logger', 'core.capabilities', 'share.setup'];
  static readonly provide = 'management';

  constructor(ctx: Context) {
    super(ctx, 'management');
    const share = (ctx.get('share.setup') as any).contract;
    (ctx.get('core.logger') as any).get('plugins', 'management').debug('management: Setup');

        share.url.locators.create(new ManagementAppLocatorDefinition());

        (ctx.get('core.capabilities') as any).registerProvider(capabilitiesProvider);
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     this.logger.debug('management: Started');
    //     return {};
    //   }
  }
}
