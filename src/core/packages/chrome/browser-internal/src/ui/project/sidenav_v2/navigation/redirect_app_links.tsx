/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import useObservable from 'react-use/lib/useObservable';
import type { NavigationProps } from '../types';

export interface NavigationRedirectWrapperProps {
  application: NavigationProps['application'];
  children: React.ReactNode;
}

export const RedirectNavigationAppLinks: React.FC<NavigationRedirectWrapperProps> = ({
  application,
  children,
}) => {
  const currentAppId = useObservable(application.currentAppId$);

  return (
    <RedirectAppLinks
      navigateToUrl={application.navigateToUrl}
      currentAppId={currentAppId}
      // reset default redirect app links styles
      css={{ display: 'flex', height: '100%', flexDirection: 'row' }}
    >
      {children}
    </RedirectAppLinks>
  );
};
