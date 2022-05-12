/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { TestBed } from '@kbn/test-jest-helpers';
export { findTestSubject } from '@kbn/test-jest-helpers';

export {
  setupEnvironment,
  WithFieldEditorDependencies,
  spySearchQuery,
  spySearchQueryResponse,
  spyIndexPatternGetAllFields,
  fieldFormatsOptions,
  indexPatternNameForTest,
  setSearchResponseLatency,
} from './setup_environment';

export {
  getCommonActions,
  waitForUpdates,
  waitForDocumentsAndPreviewUpdate,
} from './common_actions';

export type { EsDoc, TestDoc } from './mocks';
export { mockDocuments } from './mocks';
