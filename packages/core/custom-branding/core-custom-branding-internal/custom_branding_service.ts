/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

/** @internal */
export class CustomBrandingService {
  logo: string | undefined = useObservable(
    logo$ ? logo$ : new BehaviorSubject<string | undefined>(undefined)
  );
  favicon: string | undefined = useObservable(
    favicon$ ? favicon$ : new BehaviorSubject<string | undefined>(undefined)
  );
  pageTitle: string | undefined = useObservable(
    pageTitle$ ? pageTitle$ : new BehaviorSubject<string | undefined>(undefined)
  );
  customizedLogo: string | undefined = useObservable(
    customizedLogo$ ? customizedLogo$ : new BehaviorSubject<string | undefined>(undefined)
  );
  // set as async in terms of how this will be gathered and brought into core at start of the service
  async start() {
    const customBranding$ = new Map();
    return {
      get: () => {
        return;
      },
      set: () => {
        return customBranding$
          .set('logo', this.logo)
          .set('favicon', this.favicon)
          .set('pageTitle', this.pageTitle)
          .set('customizedLogo', this.customizedLogo);
      },
    };
  }
}
