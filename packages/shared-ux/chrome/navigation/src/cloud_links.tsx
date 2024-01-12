/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { CloudLinkId } from '@kbn/core-chrome-browser';

export interface CloudLink {
  title: string;
  href: string;
}

export type CloudLinks = {
  [id in CloudLinkId]?: CloudLink;
};

export const getCloudLinks = (cloud: {
  billingUrl?: string;
  deploymentUrl?: string;
  performanceUrl?: string;
  usersAndRolesUrl?: string;
}): CloudLinks => {
  const { billingUrl, deploymentUrl, performanceUrl, usersAndRolesUrl } = cloud;

  const links: CloudLinks = {};

  if (usersAndRolesUrl) {
    links.userAndRoles = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.usersAndRolesLinkText',
        {
          defaultMessage: 'Users and roles',
        }
      ),
      href: usersAndRolesUrl,
    };
  }

  if (performanceUrl) {
    links.performance = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.performanceLinkText',
        {
          defaultMessage: 'Performance',
        }
      ),
      href: performanceUrl,
    };
  }

  if (billingUrl) {
    links.billingAndSub = {
      title: i18n.translate('sharedUXPackages.chrome.sideNavigation.cloudLinks.billingLinkText', {
        defaultMessage: 'Billing and subscription',
      }),
      href: billingUrl,
    };
  }

  if (deploymentUrl) {
    links.deployment = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.deploymentLinkText',
        {
          defaultMessage: 'Project',
        }
      ),
      href: deploymentUrl,
    };
  }

  return links;
};
