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
import type { ChromeBreadcrumb, Workflows } from '@kbn/core-chrome-browser';
import { getWorkspaceSwitcherBreadCrumb } from '../workspace_switcher_breadcrumb';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  workflows$: Observable<Workflows>;
  onWorkflowChange: (id: string) => void;
}

export function HeaderBreadcrumbs({ breadcrumbs$, workflows$, onWorkflowChange }: Props) {
  const breadcrumbs = useObservable(breadcrumbs$, []);
  const workflows = useObservable(workflows$, {});
  let crumbs = [getWorkspaceSwitcherBreadCrumb({ workflows, onWorkflowChange }), ...breadcrumbs];

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

  return <EuiBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />;
}
