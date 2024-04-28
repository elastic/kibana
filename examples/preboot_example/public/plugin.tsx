/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { ConfigType } from './config';

export class PrebootExamplePlugin implements Plugin<void, void, {}, {}> {
  #config: ConfigType;
  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.#config = initializerContext.config.get<ConfigType>();
  }

  public setup(core: CoreSetup) {
    core.application.register({
      id: 'prebootExample',
      title: 'Preboot Example',
      appRoute: '/',
      chromeless: true,
      mount: (params) => {
        const root = createRoot(params.element);
        root.render(<App http={core.http} token={this.#config.token} />);
        return () => root.unmount();
      },
    });
  }

  public start(core: CoreStart) {}
}
