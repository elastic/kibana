/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable } from 'rxjs';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
} from '@kbn/core-chrome-browser';
import { type State, type ArrayState } from './state_helpers';
export interface BreadcrumbsState {
  breadcrumbs: ArrayState<ChromeBreadcrumb>;
  breadcrumbsAppendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
  breadcrumbsBadges: ArrayState<ChromeBreadcrumbsBadge>;
  legacyBadge: State<ChromeBadge | undefined>;
  breadcrumbsAppendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
}
export declare const createBreadcrumbsState: () => BreadcrumbsState;
