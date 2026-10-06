/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import type React from 'react';
import type { Observable } from 'rxjs';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
export type NavigateToUrl = (url: string) => Promise<void> | void;
/**
 * Contextual services for this component.
 * @deprecated
 */
export interface RedirectAppLinksServices {
  navigateToUrl: NavigateToUrl;
  currentAppId?: string;
}
/**
 * Kibana-specific contextual services to be adapted for this component.
 * @deprecated
 */
export interface RedirectAppLinksKibanaDependencies {
  coreStart: {
    application: {
      currentAppId$: Observable<string | undefined>;
      navigateToUrl: NavigateToUrl;
    };
  };
}
/**
 * Props for the `RedirectAppLinks` component.
 * @deprecated
 */
export type RedirectAppLinksProps = Partial<
  RedirectAppLinksServices & RedirectAppLinksKibanaDependencies
> &
  DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
export declare const redirectAppLinksStyles: import('@emotion/utils').SerializedStyles;
/**
 * @deprecated - This component is deprecated and usages of it can be safely removed from your codebase.
 * The link navigation is handled by GlobalRedirectAppLinks component at the root of Kibana.
 * When removing the usages of this component, make sure to check that your app layout hasn't been affected since this adds additional div with styles
 */
export declare const RedirectAppLinks: FC<React.PropsWithChildren<RedirectAppLinksProps>>;
