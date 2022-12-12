/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import useObservable, { Observable } from 'react-use/lib/useObservable';
import type { CustomBranding } from '@kbn/core-custom-branding';

interface Props extends CustomBranding {
  logo$?: Observable<string>;
  favicon$?: Observable<string>;
  pageTitle$?: Observable<string>;
  customizedLogo$?: Observable<string>;
  logo?: string;
  favicon?: string;
  pageTitle?: string;
  customizedLogo?: string;
}

/** @internal */
export function CustomBrandingService({ logo, favicon, pageTitle, customizedLogo }: Props) {
  const customBrandingPerOperator$ = new Map<string, string | Observable<string> | undefined>();
  const logo$ = getObservable$(logo);
  const favicon$ = getObservable$(favicon);
  const pageTitle$ = getObservable$(pageTitle);
  const customizedLogo$ = getObservable$(customizedLogo);
  return {
    // get what is passed to the service
    get: (property: string | Observable<string> | undefined) => getObservable$(property),

    // set the parameters which may have come in as observables if defined
    set: () =>
      customBrandingPerOperator$
        .set('logo', logo$)
        .set('favicon', favicon$)
        .set('pageTitle', pageTitle$)
        .set('customizedLogo', customizedLogo$),
  };
}

// Helper function
export const getObservable$ = (logo: string | Observable<string> | undefined) =>
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useObservable(
    logo
      ? (logo as unknown as Observable<string>)
      : new BehaviorSubject<string | undefined>(undefined)
  );
