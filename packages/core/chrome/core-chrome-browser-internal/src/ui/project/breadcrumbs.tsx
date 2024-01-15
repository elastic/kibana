/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBreadcrumbs } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
}

export function Breadcrumbs({ breadcrumbs$ }: Props) {
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

  return (
    <EuiBreadcrumbs
      breadcrumbs={crumbs}
      data-test-subj="breadcrumbs"
      // reduce number of visible breadcrumbs due to increased max-width of the root breadcrumbs
      responsive={{
        xs: 1,
        s: 2,
        m: 3,
        l: 4,
        xl: 7,
      }}
    />
  );
}
