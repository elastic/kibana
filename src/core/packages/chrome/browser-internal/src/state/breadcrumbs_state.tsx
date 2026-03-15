/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { combineLatest, distinctUntilChanged, map, type Observable, shareReplay } from 'rxjs';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
} from '@kbn/core-chrome-browser';
import { HeaderBreadcrumbsBadges } from '@kbn/core-chrome-browser-components';
import { createState, createArrayState, type State, type ArrayState } from './state_helpers';

export interface BreadcrumbsState {
  breadcrumbs: ArrayState<ChromeBreadcrumb>;
  breadcrumbsAppendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
  breadcrumbsBadges: ArrayState<ChromeBreadcrumbsBadge>;
  legacyBadge: State<ChromeBadge | undefined>;
  breadcrumbsAppendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
}

const chromeBadgeToBreadcrumbsBadge = (badge: ChromeBadge): ChromeBreadcrumbsBadge => ({
  badgeText: badge.text,
  renderCustomBadge: ({ badgeText }) => (
    <EuiBetaBadge
      alignment="middle"
      label={badgeText}
      tooltipContent={badge.tooltip}
      iconType={badge.iconType}
      data-test-subj="headerBadge"
      data-test-badge-label={badge.text}
    />
  ),
});

export const createBreadcrumbsState = (): BreadcrumbsState => {
  const breadcrumbs = createArrayState<ChromeBreadcrumb>();
  const breadcrumbsAppendExtensions = createArrayState<ChromeBreadcrumbsAppendExtension>();
  const breadcrumbsBadges = createArrayState<ChromeBreadcrumbsBadge>();
  const legacyBadge = createState<ChromeBadge | undefined>(undefined);

  const convertedLegacyBadge$ = legacyBadge.$.pipe(
    map((legacy) => (legacy ? chromeBadgeToBreadcrumbsBadge(legacy) : undefined)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const allBadges$ = combineLatest([breadcrumbsBadges.$, convertedLegacyBadge$]).pipe(
    map(([badges, converted]) => (converted ? [converted, ...badges] : badges)),
    distinctUntilChanged(
      (prev, next) => prev.length === next.length && prev.every((b, i) => b === next[i])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const badgesExtension$ = combineLatest([breadcrumbsAppendExtensions.$, allBadges$]).pipe(
    map(([extensions, allBadges]): [boolean, ChromeBreadcrumbsBadge[]] => [
      extensions.length === 0,
      allBadges,
    ]),
    distinctUntilChanged(
      ([prevIsFirst, prevBadges], [nextIsFirst, nextBadges]) =>
        prevIsFirst === nextIsFirst && prevBadges === nextBadges
    ),
    map(([isFirst, allBadges]): ChromeBreadcrumbsAppendExtension | undefined => {
      if (allBadges.length === 0) {
        return undefined;
      }
      return {
        content: <HeaderBreadcrumbsBadges badges={allBadges} isFirst={isFirst} />,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const breadcrumbsAppendExtensionsWithBadges$ = combineLatest([
    breadcrumbsAppendExtensions.$,
    badgesExtension$,
  ]).pipe(
    map(([extensions, badgesExt]) => (badgesExt ? [...extensions, badgesExt] : extensions)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  return {
    breadcrumbs,
    breadcrumbsAppendExtensions,
    breadcrumbsBadges,
    legacyBadge,
    breadcrumbsAppendExtensionsWithBadges$,
  };
};
