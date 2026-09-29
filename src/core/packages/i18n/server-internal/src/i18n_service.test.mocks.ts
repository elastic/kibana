/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getAllKibanaTranslationFilesMock = vi.fn();
export const groupFilesByLocaleMock = vi.fn().mockReturnValue({});
export const computeLocaleFileHashMock = vi.fn().mockResolvedValue('mock-file-hash');
vi.doMock('./get_kibana_translation_files', () => {
  const mocked = {
    getAllKibanaTranslationFiles: getAllKibanaTranslationFilesMock,
    groupFilesByLocale: groupFilesByLocaleMock,
    computeLocaleFileHash: computeLocaleFileHashMock,
  };
  return { ...mocked, default: mocked };
});

export const initTranslationsMock = vi.fn();
vi.doMock('./init_translations', () => {
  const mocked = {
    initTranslations: initTranslationsMock,
  };
  return { ...mocked, default: mocked };
});

export const registerRoutesMock = vi.fn();
vi.doMock('./routes', () => {
  const mocked = {
    registerRoutes: registerRoutesMock,
  };
  return { ...mocked, default: mocked };
});
