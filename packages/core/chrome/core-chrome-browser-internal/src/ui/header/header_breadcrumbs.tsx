/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHeaderBreadcrumbs } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import classNames from 'classnames';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { InternalApplicationStart } from '@kbn/core-application-browser-internal';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  application: InternalApplicationStart;
}

export function HeaderBreadcrumbs({ breadcrumbs$, application }: Props) {
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

  return (
    <RedirectAppLinks coreStart={{ application }}>
      <EuiHeaderBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />
    </RedirectAppLinks>
  );
}
