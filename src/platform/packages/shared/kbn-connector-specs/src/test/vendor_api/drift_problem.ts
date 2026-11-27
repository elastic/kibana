/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MANIFEST } from './spec/load_vendor_specs';

/**
 * A problem the check found that concerns no single action. The ones an issue says something
 * specific about keep their parts, so the issue's table can be built from them rather than read
 * back out of a sentence; anything else is kept as the text it was reported as.
 */
export type DriftProblem =
  | {
      readonly kind: 'invalid-schema';
      /** The auth type whose run hit it; one problem per auth type. */
      readonly authType: string;
      /** `METHOD /path`. */
      readonly operation: string;
      /** Where in the operation, e.g. `response 200 application/json`. */
      readonly location: string;
      readonly message: string;
    }
  | {
      readonly kind: 'undeclared-pagination';
      /** `METHOD /path`. */
      readonly operation: string;
      readonly source: string;
      /** Why it looks like a collection, e.g. `it returns an array`. */
      readonly reason: string;
    }
  | { readonly kind: 'other'; readonly text: string };

/** A problem with no parts of its own, as it was reported. */
export const otherProblem = (text: string): DriftProblem => ({ kind: 'other', text });

/** How the script lists a problem, which is also how an issue shows one it knows nothing about. */
export const problemTextOf = (problem: DriftProblem): string => {
  switch (problem.kind) {
    case 'invalid-schema':
      return `Auth type ${problem.authType}: ${problem.operation} (${problem.location}): ${problem.message}`;
    case 'undeclared-pagination':
      return `${problem.operation} (${problem.source}) looks like it returns a collection, as ${problem.reason}; declare its "pagination" in ${MANIFEST}, or "none" if it returns everything at once`;
    default:
      return problem.text;
  }
};
