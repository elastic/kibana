/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Location } from '@oxlint/plugins';
import type { ParsedDisableComment } from './regex';

/**
 * Returns where to report a disable comment so the comment cannot suppress its own report, which
 * it would when it is naked or names the reporting rule. Oxlint suppresses diagnostics overlapping
 * an `*-disable` block from its first character and the whole `*-disable-line` line up to the
 * comment's end, so those reports use a zero-length location at the comment start or end.
 */
export function getReportLocFromComment({ disableValueType, loc }: ParsedDisableComment): Location {
  switch (disableValueType) {
    case 'disable-next-line':
      return loc;
    case 'disable-line':
      return { start: loc.end, end: loc.end };
    case 'disable':
      return { start: loc.start, end: loc.start };
  }
}
