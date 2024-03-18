/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import type {
  RedirectAppLinksProps,
  RedirectAppLinksKibanaDependencies,
} from '@kbn/shared-ux-link-redirect-app-types';

import { RedirectAppLinks as RedirectAppLinksContainer } from './redirect_app_links.container';
import { RedirectAppLinksKibanaProvider, RedirectAppLinksProvider } from './services';

const isKibanaContract = (services: any): services is RedirectAppLinksKibanaDependencies => {
  return typeof services.coreStart !== 'undefined';
};

/**
 * This component composes `RedirectAppLinksContainer` with either `RedirectAppLinksProvider` or
 * `RedirectAppLinksKibanaProvider` based on the services provided, creating a single component
 * with which consumers can wrap their components or solutions.
 */
export const RedirectAppLinks: FC<RedirectAppLinksProps> = ({ children, ...props }) => {
  if (isKibanaContract(props)) {
    const { coreStart, ...containerProps } = props;
    const container = (
      <RedirectAppLinksContainer {...containerProps}>{children}</RedirectAppLinksContainer>
    );
    return (
      <RedirectAppLinksKibanaProvider {...{ coreStart }}>
        {container}
      </RedirectAppLinksKibanaProvider>
    );
  }

  const { navigateToUrl, currentAppId, ...containerProps } = props;
  const container = (
    <RedirectAppLinksContainer {...containerProps}>{children}</RedirectAppLinksContainer>
  );
  return (
    <RedirectAppLinksProvider {...{ currentAppId, navigateToUrl }}>
      {container}
    </RedirectAppLinksProvider>
  );
};
