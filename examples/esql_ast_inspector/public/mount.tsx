/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { CoreSetup, AppMountParameters } from '@kbn/core/public';
import type { StartDependencies } from './plugin';

export const mount =
  (coreSetup: CoreSetup<StartDependencies>) =>
  async ({ element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    const i18nCore = core.i18n;

    const reactElement = (
      <i18nCore.Context>
        <App core={core} plugins={plugins} />
      </i18nCore.Context>
    );

    render(reactElement, element);
    return () => {
      unmountComponentAtNode(element);
      plugins.data.search.session.clear();
    };
  };
