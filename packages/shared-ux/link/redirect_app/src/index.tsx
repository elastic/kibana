/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { RedirectAppLinks as RedirectAppLinksContainer } from './redirect_app_links';
export { RedirectAppLinks as RedirectAppLinksComponent } from './redirect_app_links.component';
export { RedirectAppLinksKibanaProvider, RedirectAppLinksProvider } from './services';

export type {
  Services as RedirectAppLinksServices,
  KibanaDependencies as RedirectAppLinksKibanaDependencies,
} from './services';

export {
  getMockServices as getRedirectAppLinksMockServices,
  getStoryArgTypes as getRedirectAppLinksStoryArgTypes,
  getStoryServices as getRedirectAppLinksStoryServices,
} from './mocks';

import React, { FC } from 'react';
import { RedirectAppLinks as RedirectAppLinksContainer } from './redirect_app_links';
import {
  Services,
  KibanaDependencies,
  RedirectAppLinksKibanaProvider,
  RedirectAppLinksProvider,
} from './services';

const isKibanaContract = (services: any): services is KibanaDependencies => {
  return typeof services.coreStart !== 'undefined';
};

/**
 * This component composes `RedirectAppLinksContainer` with either `RedirectAppLinksProvider` or
 * `RedirectAppLinksKibanaProvider` based on the services provided, creating a single component
 * with which consumers can wrap their components or solutions.
 */
export const RedirectAppLinks: FC<Services | KibanaDependencies> = ({ children, ...services }) => {
  const container = <RedirectAppLinksContainer>{children}</RedirectAppLinksContainer>;

  if (isKibanaContract(services)) {
    const { coreStart } = services;
    return (
      <RedirectAppLinksKibanaProvider {...{ coreStart }}>
        {container}
      </RedirectAppLinksKibanaProvider>
    );
  }

  const { navigateToUrl, currentAppId } = services;
  return (
    <RedirectAppLinksProvider {...{ currentAppId, navigateToUrl }}>
      {container}
    </RedirectAppLinksProvider>
  );
};
