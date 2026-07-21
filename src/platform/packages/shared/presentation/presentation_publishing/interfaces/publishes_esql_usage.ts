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
  usesEsql$: PublishingSubject<boolean>;
}

export const apiPublishesEsqlUsage = (unknownApi: unknown): unknownApi is PublishesEsqlUsage =>
  Boolean(unknownApi && (unknownApi as PublishesEsqlUsage)?.usesEsql$ !== undefined);
