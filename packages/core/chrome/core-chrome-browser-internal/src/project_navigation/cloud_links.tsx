/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { CloudLinks, CloudLink, CloudURLs } from '@kbn/core-chrome-browser';

const stripTrailingForwardSlash = (str: string) => {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
};

const parseCloudURLs = (cloudLinks: CloudLinks): CloudLinks => {
  const { userAndRoles, billingAndSub, deployment, performance } = cloudLinks;

  // We remove potential trailing forward slash ("/") at the end of the URL
  // because it breaks future navigation in Cloud console once we navigate there.
  const parseLink = (link?: CloudLink): CloudLink | undefined => {
    if (!link) return undefined;
    return { ...link, href: stripTrailingForwardSlash(link.href) };
  };

  return {
    ...cloudLinks,
    userAndRoles: parseLink(userAndRoles),
    billingAndSub: parseLink(billingAndSub),
    deployment: parseLink(deployment),
    performance: parseLink(performance),
  };
};

export const getCloudLinks = (cloud: CloudURLs): CloudLinks => {
  const { billingUrl, deploymentUrl, performanceUrl, usersAndRolesUrl } = cloud;

  const links: CloudLinks = {};

  if (usersAndRolesUrl) {
    links.userAndRoles = {
      title: i18n.translate('core.ui.chrome.sideNavigation.cloudLinks.usersAndRolesLinkText', {
        defaultMessage: 'Users and roles',
      }),
      href: usersAndRolesUrl,
    };
  }

  if (performanceUrl) {
    links.performance = {
      title: i18n.translate('core.ui.chrome.sideNavigation.cloudLinks.performanceLinkText', {
        defaultMessage: 'Performance',
      }),
      href: performanceUrl,
    };
  }

  if (billingUrl) {
    links.billingAndSub = {
      title: i18n.translate('core.ui.chrome.sideNavigation.cloudLinks.billingLinkText', {
        defaultMessage: 'Billing and subscription',
      }),
      href: billingUrl,
    };
  }

  if (deploymentUrl) {
    links.deployment = {
      title: i18n.translate('core.ui.chrome.sideNavigation.cloudLinks.deploymentLinkText', {
        defaultMessage: 'Project',
      }),
      href: deploymentUrl,
    };
  }

  return parseCloudURLs(links);
};
