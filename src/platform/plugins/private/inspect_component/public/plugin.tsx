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
import type { DeveloperToolbarStart } from '@kbn/developer-toolbar-plugin/public';
import type { ConfigSchema } from '../server/config';

interface PluginStartDeps {
  developerToolbar?: DeveloperToolbarStart;
}

export class InspectComponentPluginPublic implements Plugin<void, PluginStartDeps> {
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;
  private readonly logger: Logger;
  private readonly branch: string;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ConfigSchema>();
    this.isEnabled = enabled;
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.branch = initializerContext.env.packageInfo.branch;
  }

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, plugins: PluginStartDeps) {
    if (this.isEnabled && this.isDev) {
      Promise.all([
        import('./components/inspect/inspect_button'),
        import('@kbn/react-kibana-mount'),
      ])
        .then(([{ InspectButton }, { toMountPoint }]) => {
          if (plugins.developerToolbar) {
            plugins.developerToolbar.registerItem({
              id: 'Inspect Component',
              children: (
                <InspectButton
                  core={core}
                  branch={this.branch}
                  buttonLocation={'developerToolbar'}
                />
              ),
            });
          } else {
            core.chrome.navControls.registerRight({
              order: 1002,
              mount: toMountPoint(
                <InspectButton core={core} branch={this.branch} buttonLocation={'header'} />,
                core.rendering
              ),
            });
          }
        })
        .catch(() => {
          this.logger.error('Failed to import plugin files.');
        });
    }

    return {};
  }

  public stop() {}
}
