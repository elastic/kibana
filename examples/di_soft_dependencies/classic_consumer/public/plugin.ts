/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import { ExtensionService, OnExtensionsReady } from '@kbn/core-di';
import { LookupBGreeter } from '@kbn/di-soft-dependencies-example-tokens';
import { LOOKUP_B_DISABLED, PLUGIN_ID } from '../common';
import { report } from './report';

export class ClassicConsumerPlugin implements Plugin {
  public setup(core: CoreSetup): void {
    const container = core.injection.getContainer();
    const extensionService = container.get(ExtensionService);
    container.bind(OnExtensionsReady).toConstantValue(() =>
      report({
        id: PLUGIN_ID,
        fromLookupB: extensionService.get(LookupBGreeter)?.greet() ?? LOOKUP_B_DISABLED,
      })
    );
  }

  public start(): void {}
}
