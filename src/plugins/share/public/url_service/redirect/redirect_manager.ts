/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'src/core/public';

export class RedirectManager {
  public registerRedirectApp(core: CoreSetup) {
    core.application.register({
      id: 'r',
      title: 'Redirect endpoint',
      chromeless: true,
      mount: (params) => {
        params.element.innerHTML = '…';
        return async () => {};
      },
    });
  }
}
