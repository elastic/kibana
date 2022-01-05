/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
