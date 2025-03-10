/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PostInitState, PostDocInitState, OutdatedDocumentsSearchState } from '../state/types';

export const createPostInitState = (): PostInitState => ({
  controlState: 'INIT',
  retryDelay: 0,
  retryCount: 0,
  logs: [],
  currentIndex: '.kibana_1',
  aliases: ['.kibana'],
  aliasActions: [],
  previousMappings: { properties: {} },
  currentIndexMeta: {},
  skipDocumentMigration: false,
  previousAlgorithm: 'zdt',
});

export const createPostDocInitState = (): PostDocInitState => ({
  ...createPostInitState(),
  excludeOnUpgradeQuery: { bool: {} },
  excludeFromUpgradeFilterHooks: {},
  outdatedDocumentsQuery: { bool: {} },
  transformRawDocs: jest.fn(),
});

export const createOutdatedDocumentSearchState = (): OutdatedDocumentsSearchState => ({
  ...createPostDocInitState(),
  pitId: '42',
  lastHitSortValue: undefined,
  corruptDocumentIds: [],
  transformErrors: [],
  hasTransformedDocs: false,
  progress: {
    processed: undefined,
    total: undefined,
  },
});
