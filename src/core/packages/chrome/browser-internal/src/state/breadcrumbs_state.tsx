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
import deepEqual from 'react-fast-compare';
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

interface BadgesExtensionRenderModel {
  badges: ChromeBreadcrumbsBadge[];
  isFirst: boolean;
}

const toBadgesExtensionRenderModel = (
  badges: ChromeBreadcrumbsBadge[],
  extensionCount: number
): BadgesExtensionRenderModel | undefined => {
  if (badges.length === 0) {
    return undefined;
  }

  return {
    badges,
    isFirst: extensionCount === 0,
  };
};

const areBadgesRenderModelsEqual = (
  prev: BadgesExtensionRenderModel | undefined,
  next: BadgesExtensionRenderModel | undefined
) => {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  return prev.isFirst === next.isFirst && deepEqual(prev.badges, next.badges);
};

const toBadgesExtension = (
  badgesRenderModel: BadgesExtensionRenderModel | undefined
): ChromeBreadcrumbsAppendExtension | undefined => {
  if (!badgesRenderModel) {
    return undefined;
  }

  return {
    content: (
      <HeaderBreadcrumbsBadges
        badges={badgesRenderModel.badges}
        isFirst={badgesRenderModel.isFirst}
      />
    ),
  };
};

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

  const allBadges$ = combineLatest([breadcrumbsBadges.$, legacyBadge.$]).pipe(
    map(([badges, legacy]) => {
      if (!legacy) {
        return badges;
      }
      return [chromeBadgeToBreadcrumbsBadge(legacy), ...badges];
    }),
    distinctUntilChanged(deepEqual),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const badgesExtension$ = combineLatest([allBadges$, breadcrumbsAppendExtensions.$]).pipe(
    map(([badges, extensions]) => toBadgesExtensionRenderModel(badges, extensions.length)),
    distinctUntilChanged(areBadgesRenderModelsEqual),
    map(toBadgesExtension),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const breadcrumbsAppendExtensionsWithBadges$ = combineLatest([
    breadcrumbsAppendExtensions.$,
    badgesExtension$,
  ]).pipe(
    map(([extensions, badgesExtension]) => {
      if (!badgesExtension) {
        return extensions;
      }

      return [...extensions, badgesExtension];
    }),
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
