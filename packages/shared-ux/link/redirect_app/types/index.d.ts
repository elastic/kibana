/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { DetailedHTMLProps, HTMLAttributes } from 'react';

export type NavigateToUrl = (url: string) => Promise<void> | void;

/**
 * Contextual services for this component.
 */
export interface RedirectAppLinksServices {
  navigateToUrl: NavigateToUrl;
  currentAppId?: string;
}

/**
 * Kibana-specific contextual services to be adapted for this component.
 */
export interface RedirectAppLinksKibanaDependencies {
  coreStart: {
    application: {
      currentAppId$: Observable<string | undefined>;
      navigateToUrl: NavigateToUrl;
    };
  };
}

/** Props for the `RedirectAppLinks` component. */
export type RedirectAppLinksProps = RedirectAppLinksServices | RedirectAppLinksKibanaDependencies;

/** Props for the `RedirectAppLinksComponent`. */
export interface RedirectAppLinksComponentProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  navigateToUrl: NavigateToUrl;
  currentAppId?: string | undefined;
}
