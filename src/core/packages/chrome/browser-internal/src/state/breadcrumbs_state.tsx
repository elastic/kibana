/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { combineLatest, distinctUntilChanged, map, type Observable, shareReplay } from 'rxjs';
import deepEqual from 'react-fast-compare';
import type {
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
} from '@kbn/core-chrome-browser';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { HeaderBreadcrumbsBadges } from '../ui/header/header_breadcrumbs_badges';
import { createArrayState, type ArrayState } from './state_helpers';

interface BreadcrumbsState {
  breadcrumbs: ArrayState<ChromeBreadcrumb>;
  breadcrumbsAppendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
  breadcrumbsBadges: ArrayState<ChromeBreadcrumbsBadge>;
  breadcrumbsAppendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
}

export const createBreadcrumbsState = (): BreadcrumbsState => {
  const breadcrumbs = createArrayState<ChromeBreadcrumb>();
  const breadcrumbsAppendExtensions = createArrayState<ChromeBreadcrumbsAppendExtension>();
  const breadcrumbsBadges = createArrayState<ChromeBreadcrumbsBadge>();

  const breadcrumbsAppendExtensionsWithBadges$ = combineLatest([
    breadcrumbsAppendExtensions.$,
    breadcrumbsBadges.$,
  ]).pipe(
    distinctUntilChanged(([prevExtensions, prevBadges], [nextExtensions, nextBadges]) => {
      return deepEqual(prevExtensions, nextExtensions) && deepEqual(prevBadges, nextBadges);
    }),
    map(([extensions, badges]) => {
      if (badges.length === 0) {
        return extensions;
      }
      return [
        ...extensions,
        {
          content: mountReactNode(
            <HeaderBreadcrumbsBadges badges={badges} isFirst={extensions.length === 0} />
          ),
        },
      ];
    }),
    shareReplay(1)
  );

  return {
    breadcrumbs,
    breadcrumbsAppendExtensions,
    breadcrumbsBadges,
    breadcrumbsAppendExtensionsWithBadges$,
  };
};
