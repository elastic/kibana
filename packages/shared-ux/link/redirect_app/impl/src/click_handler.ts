/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MouseEvent } from 'react';
import { getClosestLink, hasActiveModifierKey } from '@kbn/shared-ux-utility';
import { NavigateToUrl } from '@kbn/shared-ux-link-redirect-app-types';

interface CreateCrossAppClickHandlerOptions {
  event: MouseEvent<HTMLElement>;
  navigateToUrl: NavigateToUrl;
  container: HTMLElement | null;
  currentAppId?: string;
}

/**
 * Constructs a click handler that will redirect the user using `navigateToUrl` if the
 * correct conditions are met.
 */
export const navigateToUrlClickHandler = ({
  event,
  container,
  navigateToUrl,
  currentAppId,
}: CreateCrossAppClickHandlerOptions) => {
  if (!container || !currentAppId) {
    return;
  }

  // see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/12239
  const target = event.target as HTMLElement;

  const link = getClosestLink(target, container);

  if (!link) {
    return;
  }

  const isNotEmptyHref = link.href;
  const hasNoTarget = link.target === '' || link.target === '_self';
  const isLeftClickOnly = event.button === 0;

  if (
    isNotEmptyHref &&
    hasNoTarget &&
    isLeftClickOnly &&
    !event.defaultPrevented &&
    !hasActiveModifierKey(event)
  ) {
    event.preventDefault();
    navigateToUrl(link.href);
  }
};
