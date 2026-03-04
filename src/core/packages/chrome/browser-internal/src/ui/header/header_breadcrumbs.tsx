/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHeaderBreadcrumbs } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { prepareBreadcrumbs } from '../breadcrumb_utils';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
}

export function HeaderBreadcrumbs({ breadcrumbs$ }: Props) {
  const breadcrumbs = useObservable(breadcrumbs$, []);
  const crumbs = prepareBreadcrumbs(breadcrumbs);

  return <EuiHeaderBreadcrumbs breadcrumbs={crumbs} max={10} data-test-subj="breadcrumbs" />;
}
