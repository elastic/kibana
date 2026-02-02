/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
  ChromeSetBreadcrumbsParams,
  ChromeSetProjectBreadcrumbsParams,
} from '@kbn/core-chrome-browser';
import type { ChromeState } from '../state/chrome_state';

export interface BreadcrumbsApi {
  getBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
  setBreadcrumbs: (breadcrumbs: ChromeBreadcrumb[], params?: ChromeSetBreadcrumbsParams) => void;
  getBreadcrumbsAppendExtensions$: () => Observable<ChromeBreadcrumbsAppendExtension[]>;
  setBreadcrumbsAppendExtension: (extension: ChromeBreadcrumbsAppendExtension) => () => void;
  setBreadcrumbsBadges: (badges: ChromeBreadcrumbsBadge[]) => void;
}

export interface BreadcrumbsApiDeps {
  state: ChromeState;
  setProjectBreadcrumbs: (
    breadcrumbs: ChromeBreadcrumb[] | ChromeBreadcrumb,
    params?: ChromeSetProjectBreadcrumbsParams
  ) => void;
}

export function createBreadcrumbsApi({
  state,
  setProjectBreadcrumbs,
}: BreadcrumbsApiDeps): BreadcrumbsApi {
  return {
    getBreadcrumbs$: () => state.breadcrumbs.classic.$,

    setBreadcrumbs: (newBreadcrumbs, params = {}) => {
      state.breadcrumbs.classic.set(newBreadcrumbs);
      if (params.project) {
        const { value: projectValue, absolute = false } = params.project;
        setProjectBreadcrumbs(projectValue ?? [], { absolute });
      }
    },

    getBreadcrumbsAppendExtensions$: () => state.breadcrumbs.appendExtensions.$,

    setBreadcrumbsAppendExtension: (extension) => {
      state.breadcrumbs.appendExtensions.addSorted(
        extension,
        ({ order: orderA = 50 }, { order: orderB = 50 }) => orderA - orderB
      );
      return () => {
        state.breadcrumbs.appendExtensions.remove((ext) => ext === extension);
      };
    },

    setBreadcrumbsBadges: (badges) => {
      state.breadcrumbs.badges.set(badges);
    },
  };
}
