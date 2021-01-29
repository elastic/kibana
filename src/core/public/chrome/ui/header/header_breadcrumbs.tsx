/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiFlexGroup, EuiHeaderBreadcrumbs } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { ChromeBreadcrumb, ChromeBreadcrumbsAppendExtension } from '../../chrome_service';
import { HeaderExtension } from './header_extension';

interface Props {
  appTitle$: Observable<string>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtension$: Observable<ChromeBreadcrumbsAppendExtension | undefined>;
}

export function HeaderBreadcrumbs({ appTitle$, breadcrumbs$, breadcrumbsAppendExtension$ }: Props) {
  const appTitle = useObservable(appTitle$, 'Kibana');
  const breadcrumbs = useObservable(breadcrumbs$, []);
  const breadcrumbsAppendExtension = useObservable(breadcrumbsAppendExtension$);
  let crumbs = breadcrumbs;

  if (breadcrumbs.length === 0 && appTitle) {
    crumbs = [{ text: appTitle }];
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

  if (breadcrumbsAppendExtension && crumbs[crumbs.length - 1]) {
    const lastCrumb = crumbs[crumbs.length - 1];
    lastCrumb.text = (
      <EuiFlexGroup responsive={false} gutterSize={'none'} alignItems={'baseline'}>
        <div className="eui-textTruncate">{lastCrumb.text}</div>
        <HeaderExtension extension={breadcrumbsAppendExtension.content} />
      </EuiFlexGroup>
    );
  }
  return <EuiHeaderBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />;
}
