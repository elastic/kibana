/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

const addDataLinkText = i18n.translate('home.breadcrumbs.addDataLinkText', {
  defaultMessage: 'Add data',
});

const homeLinkText = i18n.translate('home.breadcrumbs.homeTitle', {
  defaultMessage: 'Home',
});

const previousPageLinkText = i18n.translate('home.breadcrumbs.previousPageLinkText', {
  defaultMessage: 'Previous page',
});

const backToSelectionLinkText = i18n.translate(
  'home.tutorial.introduction.backToSelectionLinkText',
  {
    defaultMessage: 'Back to selection',
  }
);

const selectionLinkText = i18n.translate('home.tutorial.directory.selectionLinkText', {
  defaultMessage: 'Selection',
});

export function readReturnParamsFromHash(
  hash: string
): { returnAppId: string; returnPath: string } | undefined {
  // Home-side copy of Fleet's readReturnParams. Keep the query names in sync because Home cannot import Fleet.
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) {
    return undefined;
  }
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  const returnAppId = params.get('returnAppId');
  const returnPath = params.get('returnPath');
  if (!returnAppId || !returnPath) {
    return undefined;
  }
  return { returnAppId, returnPath };
}

function getReturnHref({
  hash,
  getUrlForApp,
}: {
  hash: string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): { returnAppId: string; href: string } | undefined {
  const returnParams = readReturnParamsFromHash(hash);
  if (!returnParams) {
    return undefined;
  }
  return {
    returnAppId: returnParams.returnAppId,
    href: getUrlForApp(returnParams.returnAppId, { path: returnParams.returnPath }),
  };
}

type GetAppTitle = (appId: string) => string | undefined;

function getReturnAppLinkText(returnAppId: string, getAppTitle?: GetAppTitle): string {
  if (returnAppId === 'observabilityOnboarding') return addDataLinkText;
  // Home registers its title as a literal, so use the localized string instead.
  if (returnAppId === 'home') return homeLinkText;
  return getAppTitle?.(returnAppId) ?? previousPageLinkText;
}

/** Returns the query string (with leading `?`) of a hash route, or an empty string. */
export function getHashQuery(hash: string): string {
  const queryStart = hash.indexOf('?');
  return queryStart === -1 ? '' : hash.slice(queryStart);
}

export function getTutorialDirectoryFirstCrumb({
  hash,
  addBasePath,
  getUrlForApp,
  getAppTitle,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
  getAppTitle?: GetAppTitle;
}): { text: string; href: string } {
  const returned = getReturnHref({ hash, getUrlForApp });
  if (!returned) {
    return {
      text: integrationsTitle,
      href: addBasePath('/app/integrations/browse'),
    };
  }
  return {
    text: getReturnAppLinkText(returned.returnAppId, getAppTitle),
    href: returned.href,
  };
}

export function getTutorialDirectoryAppHeaderBack({
  hash,
  addBasePath,
  getUrlForApp,
  getAppTitle,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
  getAppTitle?: GetAppTitle;
}): { href: string; label: string } {
  const crumb = getTutorialDirectoryFirstCrumb({
    hash,
    addBasePath,
    getUrlForApp,
    getAppTitle,
  });
  const returned = getReturnHref({ hash, getUrlForApp });
  if (returned?.returnAppId === 'observabilityOnboarding') {
    return { href: crumb.href, label: selectionLinkText };
  }
  return { href: crumb.href, label: crumb.text };
}

export function getTutorialIntroductionBackLink({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): { href: string; text?: string } {
  const returned = getReturnHref({ hash, getUrlForApp });
  if (returned?.returnAppId === 'observabilityOnboarding') {
    return { text: backToSelectionLinkText, href: returned.href };
  }
  return {
    href: addBasePath('/app/integrations'),
  };
}
