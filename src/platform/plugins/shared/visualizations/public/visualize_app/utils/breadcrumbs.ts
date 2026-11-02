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
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';

const defaultEditText = i18n.translate('visualizations.editor.defaultEditBreadcrumbText', {
  defaultMessage: 'Edit visualization',
});

const getLandingBreadcrumbs = (originatingAppName?: string) => {
  if (originatingAppName) {
    return [];
  }

  return [
    {
      text: i18n.translate('visualizations.listing.breadcrumb', {
        defaultMessage: 'Visualize library',
      }),
      href: `#${VisualizeConstants.LANDING_PAGE_PATH}`,
    },
  ];
};

export function getCreateBreadcrumbs({
  originatingAppName,
  incomingBreadcrumbs,
  redirectToOrigin,
}: {
  originatingAppName?: string;
  incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
  redirectToOrigin?: () => void;
}) {
  if (incomingBreadcrumbs?.length) {
    return [
      ...incomingBreadcrumbs,
      {
        text: i18n.translate('visualizations.editor.createBreadcrumb', {
          defaultMessage: 'Create',
        }),
      },
    ];
  }
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...getLandingBreadcrumbs(originatingAppName),
    {
      text: i18n.translate('visualizations.editor.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getCreateServerlessBreadcrumbs() {
  // TODO: https://github.com/elastic/kibana/issues/163488
  // for now, serverless breadcrumbs only set the title,
  // the rest of the breadcrumbs are handled by the serverless navigation
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
    originatingAppName,
    incomingBreadcrumbs,
    redirectToOrigin,
  }: {
    originatingAppName?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    redirectToOrigin?: () => void;
  },
  title: string = defaultEditText
) {
  if (incomingBreadcrumbs?.length) {
    return [...incomingBreadcrumbs, { text: title }];
  }
  return [
    ...(originatingAppName ? [{ text: originatingAppName, onClick: redirectToOrigin }] : []),
    ...getLandingBreadcrumbs(originatingAppName),
    {
      text: title,
    },
  ];
}

export function getEditServerlessBreadcrumbs(title: string = defaultEditText) {
  // TODO: https://github.com/elastic/kibana/issues/163488
  // for now, serverless breadcrumbs only set the title,
  // the rest of the breadcrumbs are handled by the serverless navigation
  return [
    {
      text: title,
    },
  ];
}
