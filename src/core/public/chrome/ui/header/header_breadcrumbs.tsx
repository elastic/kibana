/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
