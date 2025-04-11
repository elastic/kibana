/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useEffect } from 'react';
import { getClosestLink } from '@kbn/shared-ux-utility';

export interface GlobalRedirectAppLinkProps {
  children: ReactNode;
  navigateToUrl: (url: string) => Promise<void> | void;
}

export const GlobalRedirectAppLink = ({ children, navigateToUrl }: GlobalRedirectAppLinkProps) => {
  useEffect(() => {
    function clickHandler(event: MouseEvent) {
      const target = event.target as HTMLElement;

      const link = getClosestLink(target);

      if (!link) {
        return;
      }

      const isNotEmptyHref = link.href;
      const hasNoTarget = link.target === '' || link.target === '_self';
      const isLeftClickOnly = event.button === 0;
      const hasActiveModifierKey = event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

      if (
        isNotEmptyHref &&
        hasNoTarget &&
        isLeftClickOnly &&
        !event.defaultPrevented &&
        !hasActiveModifierKey
      ) {
        event.preventDefault();
        navigateToUrl(link.href);
      }
    }

    document.body.addEventListener('click', clickHandler);
    return () => {
      document.body.removeEventListener('click', clickHandler);
    };
  }, [navigateToUrl]);

  return <>{children}</>;
};
