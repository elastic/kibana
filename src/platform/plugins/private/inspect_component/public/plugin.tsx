/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ConfigSchema } from '../server/config';

export class InspectComponentPluginPublic implements Plugin {
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ConfigSchema>();
    this.isEnabled = enabled;
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart) {
    if (this.isDev) {
      Promise.all([
        import('./components/inspect/inspect_button'),
        import('@kbn/react-kibana-mount'),
      ])
        .then(([{ InspectButton }, { toMountPoint }]) => {
          if (this.isEnabled) {
            core.chrome.navControls.registerRight({
              order: 1002,
              mount: toMountPoint(<InspectButton core={core} />, core.rendering),
            });
          }
        })
        .catch(() => {
          this.logger.error('Failed to load plugin dependencies');
        });
    }
    return {};
  }

  public stop() {}
}
