/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';

/**
 * Optional interface for embeddables that support a "breakdown" dimension
 * (e.g. split-by / breakdown-by in charts). When combined with Smart Title,
 * the panel title can be augmented with the breakdown field name.
 */
export interface PublishesBreakdownFieldName {
  breakdownFieldName$: PublishingSubject<string | undefined>;
}

export const apiPublishesBreakdownFieldName = (
  unknownApi: null | unknown
): unknownApi is PublishesBreakdownFieldName => {
  return Boolean(
    unknownApi &&
      (unknownApi as PublishesBreakdownFieldName)?.breakdownFieldName$ !== undefined
  );
};
