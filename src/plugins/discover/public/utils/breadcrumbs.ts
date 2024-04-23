/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { addProfile, getProfile } from '../../common/customizations';
import type { DiscoverServices } from '../build_services';

const rootPath = '#/';

const getRootPath = ({ history }: DiscoverServices) => {
  const { profile } = getProfile(history.location.pathname);
  return profile ? addProfile(rootPath, profile) : rootPath;
};

function getRootBreadcrumbs({
  breadcrumb,
  services,
}: {
  breadcrumb?: string;
  services: DiscoverServices;
}): ChromeBreadcrumb[] {
  return [
    {
      text: i18n.translate('discover.rootBreadcrumb', {
        defaultMessage: 'Discover',
      }),
      deepLinkId: 'discover',
      href: breadcrumb || getRootPath(services),
    },
  ];
}

/**
 * Helper function to set the Discover's breadcrumb
 * if there's an active savedSearch, its title is appended
 */
export function setBreadcrumbs({
  rootBreadcrumbPath,
  titleBreadcrumbText,
  services,
}: {
  rootBreadcrumbPath?: string;
  titleBreadcrumbText?: string;
  services: DiscoverServices;
}) {
  const rootBreadcrumbs = getRootBreadcrumbs({
    breadcrumb: rootBreadcrumbPath,
    services,
  });
  const discoverBreadcrumbsTitle = i18n.translate('discover.discoverBreadcrumbTitle', {
    defaultMessage: 'Discover',
  });

  if (titleBreadcrumbText) {
    services.chrome.setBreadcrumbs([...rootBreadcrumbs, { text: titleBreadcrumbText }]);
  } else {
    services.chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
      },
    ]);
  }
}
