/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/**
 * These are the terms provided to Advanced Settings that map to this section. When searching,
 * Advanced Settings will match against these terms to show or hide the section.
 */
export const SEARCH_TERMS: string[] = [
  'telemetry',
  'usage data', // Keeping this term for BWC
  'usage collection',
  i18n.translate('telemetry.telemetryConstant', {
    defaultMessage: 'telemetry',
  }),
  i18n.translate('telemetry.usageCollectionConstant', {
    defaultMessage: 'usage collection',
  }),
].flatMap((term) => {
  // Automatically lower-case and split by space the terms from above
  const lowerCased = term.toLowerCase();
  return [lowerCased, ...lowerCased.split(' ')];
});
