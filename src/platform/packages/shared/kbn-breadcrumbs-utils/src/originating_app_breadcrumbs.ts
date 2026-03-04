/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  navigateToApp: (appId: string, options?: { path?: string }) => void;
}): Array<{ text: string; onClick: () => void }> {
  if (!breadcrumbTitle || !originatingApp || !originatingPath) return [];
  const lastSlashIndex = originatingPath.lastIndexOf('/');
  const listingPath = lastSlashIndex > 0 ? originatingPath.substring(0, lastSlashIndex) : undefined;

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
