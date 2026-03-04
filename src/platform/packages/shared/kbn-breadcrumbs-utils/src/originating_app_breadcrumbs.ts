/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

/**
 * Builds breadcrumbs for the originating app context (e.g. [App] > [Tab]).
 */
export function getOriginatingAppBreadcrumbs({
  originatingApp,
  originatingPath,
  breadcrumbTitle,
  originatingAppName,
  navigateToApp,
}: {
  originatingApp?: string;
  originatingPath?: string;
  breadcrumbTitle?: string;
  originatingAppName?: string;
  navigateToApp: ApplicationStart['navigateToApp'];
}): ChromeBreadcrumb[] {
  if (!breadcrumbTitle || !originatingApp || !originatingPath) return [];
  const trimmed = originatingPath.replace(/\/+$/, '');
  const lastSlashIndex = trimmed.lastIndexOf('/');
  const parentPath = lastSlashIndex > 0 ? trimmed.substring(0, lastSlashIndex) : undefined;
  // Only use parentPath if it still contains a slash, i.e. it represents a real multi-segment path
  // (e.g. '#/view' from '#/view/id') rather than a bare prefix (e.g. '#' from '#/list').
  const listingPath = parentPath?.includes('/') ? parentPath : undefined;

  return [
    {
      text: originatingAppName ?? originatingApp,
      onClick: () => navigateToApp(originatingApp, listingPath ? { path: listingPath } : undefined),
    },
    {
      text: breadcrumbTitle,
      onClick: () => navigateToApp(originatingApp, { path: originatingPath }),
    },
  ];
}
