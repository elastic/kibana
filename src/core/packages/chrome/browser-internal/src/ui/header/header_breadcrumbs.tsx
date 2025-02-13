/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHeaderBreadcrumbs } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
}

export function HeaderBreadcrumbs({ breadcrumbs$ }: Props) {
  const breadcrumbs = useObservable(breadcrumbs$, []);
  let crumbs = breadcrumbs;

  if (breadcrumbs.length === 0) {
    crumbs = [{ text: 'Kibana' }];
  }

  crumbs = crumbs.map((breadcrumb, i) => {
    const isLast = i === breadcrumbs.length - 1;
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

  return <EuiHeaderBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />;
}
