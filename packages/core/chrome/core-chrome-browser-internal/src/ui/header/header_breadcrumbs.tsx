/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  crumbs = crumbs.map((breadcrumb, i) => ({
    ...breadcrumb,
    'data-test-subj': classNames(
      'breadcrumb',
      breadcrumb['data-test-subj'],
      i === 0 && 'first',
      i === breadcrumbs.length - 1 && 'last'
    ),
  }));

  return <EuiHeaderBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />;
}
