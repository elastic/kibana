/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { matchPath } from 'react-router-dom';
import type { DiscoverServices } from '../build_services';

const getRootPath = ({ history }: DiscoverServices) => {
  const match = matchPath<{ profile?: string }>(history().location.pathname, {
    path: '/p/:profile',
  });

  return match ? `#/p/${match.params.profile}/` : '#/';
};

export function getRootBreadcrumbs({
  breadcrumb,
  services,
}: {
  breadcrumb?: string;
  services: DiscoverServices;
}) {
  return [
    {
      text: i18n.translate('discover.rootBreadcrumb', {
        defaultMessage: 'Discover',
      }),
      href: breadcrumb || getRootPath(services),
    },
  ];
}

export function getSavedSearchBreadcrumbs({
  id,
  services,
}: {
  id: string;
  services: DiscoverServices;
}) {
  return [
    ...getRootBreadcrumbs({ services }),
    {
      text: id,
    },
  ];
}

/**
 * Helper function to set the Discover's breadcrumb
 * if there's an active savedSearch, its title is appended
 */
export function setBreadcrumbsTitle({
  title,
  services,
}: {
  title: string | undefined;
  services: DiscoverServices;
}) {
  const discoverBreadcrumbsTitle = i18n.translate('discover.discoverBreadcrumbTitle', {
    defaultMessage: 'Discover',
  });

  if (title) {
    services.chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
        href: getRootPath(services),
      },
      { text: title },
    ]);
  } else {
    services.chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
      },
    ]);
  }
}
