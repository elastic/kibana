/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecChange } from '../detect_drift';
import type { ChangeCategory } from '../oasdiff_text';

/**
 * What kind of change a reviewer looks at: a change's own category, or that it only moved in the
 * spec, which the check works out from where the operation went rather than from the rule.
 */
export type ReviewKind = ChangeCategory | 'moved-same-url';

/** The heading the review tables and the summary give each kind. */
export const REVIEW_LABELS: Record<ReviewKind, string> = {
  deprecated: 'Deprecated',
  sunset: 'Sunset',
  'auth-changed': 'Auth requirement changed',
  removed: 'Removed',
  'moved-same-url': 'Moved, same URL',
  'schema-removed': 'Shared schema removed',
  'request-changed': 'Request changed',
  'response-changed': 'Response changed',
  other: 'Other',
};

/** How the summary says that passing actions are affected by a kind of change, one or several. */
export const AFFECTED: Record<ReviewKind, readonly [string, string]> = {
  deprecated: [
    'passes but uses a deprecated endpoint or field',
    'pass but use deprecated endpoints or fields',
  ],
  sunset: [
    'passes but calls an endpoint with a sunset date',
    'pass but call endpoints with a sunset date',
  ],
  'auth-changed': [
    'passes but calls an endpoint whose auth requirements changed',
    'pass but call endpoints whose auth requirements changed',
  ],
  removed: [
    'passes but calls an endpoint removed from the current spec',
    'pass but call endpoints removed from the current spec',
  ],
  'moved-same-url': [
    'calls an endpoint that moved in the spec, keeping its URL',
    'call endpoints that moved in the spec, keeping their URL',
  ],
  'schema-removed': [
    'passes but uses a schema removed from the current spec',
    'pass but use schemas removed from the current spec',
  ],
  'request-changed': [
    'passes but sends a request that changed',
    'pass but send requests that changed',
  ],
  'response-changed': [
    'passes but gets a response that changed',
    'pass but get responses that changed',
  ],
  other: ['passes but calls an endpoint that changed', 'pass but call endpoints that changed'],
};

/** A spec change that keeps the issue open, with the actions that call its operation. */
export interface ReviewItem {
  readonly kind: ReviewKind;
  readonly source: string;
  readonly change: SpecChange;
  readonly actions: readonly string[];
}
