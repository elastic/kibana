/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../publishing_subject';

/**
 * For embeddables that can use ES|QL internally without necessarily publishing
 * an ES|QL `query$` (e.g. a Vega spec with one or more ES|QL data sources).
 */
export interface PublishesEsqlUsage {
  /** Emits `true` when the embeddable is currently executing an ES|QL query, `false` otherwise.*/
  usesEsql$: PublishingSubject<boolean>;
  /** Emits the `approximation_applied` flag from the most recent ES|QL response — `true` if Elasticsearch applied approximate execution, `false` if it ran exactly, or `undefined` before the first response or when the panel is not in ES|QL mode. */
  approximationApplied$: PublishingSubject<boolean | undefined>;
}

export const apiPublishesEsqlUsage = (unknownApi: unknown): unknownApi is PublishesEsqlUsage =>
  Boolean(
    unknownApi &&
      (unknownApi as PublishesEsqlUsage)?.usesEsql$ !== undefined &&
      (unknownApi as PublishesEsqlUsage)?.approximationApplied$ !== undefined
  );
