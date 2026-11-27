/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A panel that runs a single ES|QL query and lets its container rewrite it.
 */
export interface CanUpdateESQLQuery {
  /**
   * Returns the panel's ES|QL query, or `undefined` when it cannot be rewritten
   * (e.g. by-reference panels, which would change every other usage of the saved object).
   */
  getEditableESQLQuery: () => string | undefined;
  updateESQLQuery: (esql: string) => void;
}

export const apiCanUpdateESQLQuery = (unknownApi: unknown): unknownApi is CanUpdateESQLQuery =>
  Boolean(
    unknownApi &&
      typeof (unknownApi as CanUpdateESQLQuery).getEditableESQLQuery === 'function' &&
      typeof (unknownApi as CanUpdateESQLQuery).updateESQLQuery === 'function'
  );
