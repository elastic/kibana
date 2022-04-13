/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { getClosestLink, hasActiveModifierKey } from '@kbn/shared-ux-utility';

interface CreateCrossAppClickHandlerOptions {
  navigateToUrl(url: string): Promise<void>;
  container?: HTMLElement;
}

export const createNavigateToUrlClickHandler = ({
  container,
  navigateToUrl,
}: CreateCrossAppClickHandlerOptions): React.MouseEventHandler<HTMLElement> => {
  return (e) => {
    if (!container) {
      return;
    }
    // see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/12239
    const target = e.target as HTMLElement;

    const link = getClosestLink(target, container);
    if (!link) {
      return;
    }

    const isNotEmptyHref = link.href;
    const hasNoTarget = link.target === '' || link.target === '_self';
    const isLeftClickOnly = e.button === 0;

    if (
      isNotEmptyHref &&
      hasNoTarget &&
      isLeftClickOnly &&
      !e.defaultPrevented &&
      !hasActiveModifierKey(e)
    ) {
      e.preventDefault();
      navigateToUrl(link.href);
    }
  };
};
