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
 * Returns the "Ask AI" suggested prompts, which showcase ES|QL grouping, extraction, joining and
 * filtering. The joining prompt needs a lookup index, so it is only included when one is given.
 */
export const getAskAiSuggestedPrompts = (lookupIndexName?: string): string[] => [
  i18n.translate('discover.topNav.askAi.promptGroupPatterns', {
    defaultMessage: 'Group similar messages into patterns and count each one',
  }),
  i18n.translate('discover.topNav.askAi.promptVolumeChange', {
    defaultMessage: 'Find where document volume suddenly changed',
  }),
  i18n.translate('discover.topNav.askAi.promptExtractFields', {
    defaultMessage: 'Extract the IP address and status code from <field1>',
    ignoreTag: true,
  }),
  ...(lookupIndexName
    ? [
        i18n.translate('discover.topNav.askAi.promptLookupJoin', {
          defaultMessage: 'Add details from {lookupIndexName} matched on <field1>',
          values: { lookupIndexName },
          ignoreTag: true,
        }),
      ]
    : []),
  i18n.translate('discover.topNav.askAi.promptRelevantDocuments', {
    defaultMessage: 'Find the documents most relevant to <search terms>',
    ignoreTag: true,
  }),
];
