/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

/** Maps raw ChromeBreadcrumb[] to EUI-compatible breadcrumb props */
export function prepareBreadcrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  const crumbs = breadcrumbs.length === 0 ? [{ text: 'Kibana' } as ChromeBreadcrumb] : breadcrumbs;

  return crumbs.map((breadcrumb, i) => {
    const isLast = i === crumbs.length - 1;
    const { deepLinkId, ...rest } = breadcrumb;

    return {
      ...rest,
      href: isLast ? undefined : breadcrumb.href,
      onClick: isLast ? undefined : breadcrumb.onClick,
      'data-test-subj': classNames(
        'breadcrumb',
        deepLinkId && `breadcrumb-deepLinkId-${deepLinkId}`,
        breadcrumb['data-test-subj'],
        i === 0 && 'first',
        isLast && 'last'
      ),
    };
  });
}
