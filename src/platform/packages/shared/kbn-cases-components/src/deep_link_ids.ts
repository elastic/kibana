/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Deep link ids for the Cases application. Kept in `@kbn/cases-components` so consumers (e.g. nav
 * builders in other solutions) can reference these ids without depending on `@kbn/cases-plugin`.
 */
export const CasesDeepLinkId = {
  cases: 'cases',
  casesCreate: 'cases_create',
  casesConfigure: 'cases_configure',
  casesTemplates: 'cases_templates',
} as const;

export type ICasesDeepLinkId = (typeof CasesDeepLinkId)[keyof typeof CasesDeepLinkId];
