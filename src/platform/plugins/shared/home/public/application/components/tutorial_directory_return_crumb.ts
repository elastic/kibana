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

export function getTutorialDirectoryFirstCrumb({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): { text: string; href: string } {
  const returned = getReturnHref({ hash, getUrlForApp });
  if (!returned) {
    return {
      text: integrationsTitle,
      href: addBasePath('/app/integrations/browse'),
    };
  }
  return {
    text:
      returned.returnAppId === 'observabilityOnboarding' ? addDataLinkText : previousPageLinkText,
    href: returned.href,
  };
}

export function getTutorialDirectoryAppHeaderBack({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): { href: string; label: string } {
  const crumb = getTutorialDirectoryFirstCrumb({ hash, addBasePath, getUrlForApp });
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
  if (!returned || returned.returnAppId !== 'observabilityOnboarding') {
    return {
      href: addBasePath('/app/integrations'),
    };
  }
  return {
    text: backToSelectionLinkText,
    href: returned.href,
  };
}
