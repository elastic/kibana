/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { VisualizeConstants } from '@kbn/visualizations-common';
import { getOriginatingAppBreadcrumbs } from '@kbn/embeddable-plugin/public';

const defaultEditText = i18n.translate('visualizations.editor.defaultEditBreadcrumbText', {
  defaultMessage: 'Edit visualization',
});

export function getLandingBreadcrumbs() {
  return [
    {
      text: i18n.translate('visualizations.listing.breadcrumb', {
        defaultMessage: 'Visualize library',
      }),
      href: `#${VisualizeConstants.LANDING_PAGE_PATH}`,
    },
  ];
}

export function getCreateBreadcrumbs({
  byValue,
  originatingApp,
  originatingAppName,
  originatingPath,
  breadcrumbTitle,
  redirectToOrigin,
  navigateToApp,
}: {
  byValue?: boolean;
  originatingApp?: string;
  originatingAppName?: string;
  originatingPath?: string;
  breadcrumbTitle?: string;
  redirectToOrigin?: () => void;
  navigateToApp?: (appId: string, options?: { path?: string }) => void;
}) {
  const originatingCrumbs = navigateToApp
    ? getOriginatingAppBreadcrumbs({
        originatingApp,
        originatingAppName,
        originatingPath,
        breadcrumbTitle,
        navigateToApp,
      })
    : [];
  if (originatingCrumbs.length > 0) {
    return [
      ...originatingCrumbs,
      {
        text: i18n.translate('visualizations.editor.createBreadcrumb', {
          defaultMessage: 'Create',
        }),
      },
    ];
  }
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...(!byValue && !originatingAppName ? getLandingBreadcrumbs() : []),
    {
      text: i18n.translate('visualizations.editor.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getCreateServerlessBreadcrumbs({
  byValue,
  originatingAppName,
  redirectToOrigin,
}: {
  byValue?: boolean;
  originatingAppName?: string;
  redirectToOrigin?: () => void;
}) {
  // TODO: https://github.com/elastic/kibana/issues/163488
  // for now, serverless breadcrumbs only set the title,
  // the rest of the breadcrumbs are handled by the serverless navigation
  // the serverless navigation is not yet aware of the byValue/originatingApp context
  return [
    {
      text: i18n.translate('visualizations.editor.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getEditBreadcrumbs(
  {
    byValue,
    originatingApp,
    originatingAppName,
    originatingPath,
    breadcrumbTitle,
    redirectToOrigin,
    navigateToApp,
  }: {
    byValue?: boolean;
    originatingApp?: string;
    originatingAppName?: string;
    originatingPath?: string;
    breadcrumbTitle?: string;
    redirectToOrigin?: () => void;
    navigateToApp?: (appId: string, options?: { path?: string }) => void;
  },
  title: string = defaultEditText
) {
  const originatingCrumbs = navigateToApp
    ? getOriginatingAppBreadcrumbs({
        originatingApp,
        originatingAppName,
        originatingPath,
        breadcrumbTitle,
        navigateToApp,
      })
    : [];
  if (originatingCrumbs.length > 0) {
    return [...originatingCrumbs, { text: title }];
  }
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...(!byValue && !originatingAppName ? getLandingBreadcrumbs() : []),
    {
      text: title,
    },
  ];
}

export function getEditServerlessBreadcrumbs(
  {
    byValue,
    originatingAppName,
    redirectToOrigin,
  }: {
    byValue?: boolean;
    originatingAppName?: string;
    redirectToOrigin?: () => void;
  },
  title: string = defaultEditText
) {
  // TODO: https://github.com/elastic/kibana/issues/163488
  // for now, serverless breadcrumbs only set the title,
  // the rest of the breadcrumbs are handled by the serverless navigation
  // the serverless navigation is not yet aware of the byValue/originatingApp context
  return [
    {
      text: title,
    },
  ];
}
