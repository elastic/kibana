/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { VisualizeConstants } from '../../../common/constants';

const defaultEditText = i18n.translate('visualizations.editor.defaultEditBreadcrumbText', {
  defaultMessage: 'Edit visualization',
});

export function getLandingBreadcrumbs() {
  return [
    {
      text: i18n.translate('visualizations.listing.breadcrumb', {
        defaultMessage: 'Visualize Library',
      }),
      href: `#${VisualizeConstants.LANDING_PAGE_PATH}`,
    },
  ];
}

export function getCreateBreadcrumbs({
  byValue,
  originatingAppName,
  redirectToOrigin,
}: {
  byValue?: boolean;
  originatingAppName?: string;
  redirectToOrigin?: () => void;
}) {
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...(!byValue ? getLandingBreadcrumbs() : []),
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
    originatingAppName,
    redirectToOrigin,
  }: {
    byValue?: boolean;
    originatingAppName?: string;
    redirectToOrigin?: () => void;
  },
  title: string = defaultEditText
) {
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...(!byValue ? getLandingBreadcrumbs() : []),
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
