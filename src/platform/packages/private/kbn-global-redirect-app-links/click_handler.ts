/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getClosestLink } from '@kbn/shared-ux-utility';

/**
 * Creates a click handler that intercepts safe, same-origin <a> clicks and routes via navigateToUrl.
 * Opt out with: <a data-kbn-redirect-app-link-ignore>
 */
export function createClickHandler(navigateToUrl: (url: string) => Promise<void> | void) {
  return function clickHandler(event: MouseEvent) {
    // Only left-click
    if (event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    const link = getClosestLink(target) as HTMLAnchorElement | null;
    if (!link) return;

    if (event.defaultPrevented || link.hasAttribute('data-kbn-redirect-app-link-ignore')) return;

    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;

    const hasNoTarget = !link.target || link.target === '_self';
    if (!hasNoTarget) return;

    if (link.hasAttribute('download') || /\bexternal\b/i.test(link.rel)) return;

    event.preventDefault();
    navigateToUrl(link.href);
  };
}
