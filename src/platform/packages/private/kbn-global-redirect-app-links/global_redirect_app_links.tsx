/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { createClickHandler } from './click_handler';

export interface GlobalRedirectAppLinkProps {
  children?: ReactNode;
  navigateToUrl: (url: string) => Promise<void> | void;
}

/**
 * Global click delegator: intercepts safe, same-origin <a> clicks and routes via navigateToUrl.
 * Opt out with: <a data-kbn-redirect-app-link-ignore>
 */
export const GlobalRedirectAppLink = ({ children, navigateToUrl }: GlobalRedirectAppLinkProps) => {
  useEffect(() => {
    const clickHandler = createClickHandler(navigateToUrl);

    document.body.addEventListener('click', clickHandler);
    return () => document.body.removeEventListener('click', clickHandler);
  }, [navigateToUrl]);

  return <>{children}</>;
};
