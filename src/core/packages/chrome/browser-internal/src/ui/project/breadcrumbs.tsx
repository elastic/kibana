/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBreadcrumbs } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { prepareBreadcrumbs } from '../breadcrumb_utils';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
}

export function Breadcrumbs({ breadcrumbs$ }: Props) {
  const breadcrumbs = useObservable(breadcrumbs$, []);
  const crumbs = prepareBreadcrumbs(breadcrumbs);

  return (
    <EuiBreadcrumbs
      breadcrumbs={crumbs}
      data-test-subj="breadcrumbs"
      aria-label={i18n.translate('core.ui.chrome.breadcrumbs.ariaLabel', {
        defaultMessage: 'Breadcrumbs',
      })}
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
