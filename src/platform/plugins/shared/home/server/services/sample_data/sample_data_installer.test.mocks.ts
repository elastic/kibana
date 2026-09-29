/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const insertDataIntoIndexMock = vi.fn();
vi.doMock('./lib/insert_data_into_index', () => {
  const mocked = {
    insertDataIntoIndex: insertDataIntoIndexMock,
  };
  return { ...mocked, default: mocked };
});

export const findSampleObjectsMock = vi.fn();
vi.doMock('./lib/find_sample_objects', () => {
  const mocked = {
    findSampleObjects: findSampleObjectsMock,
  };
  return { ...mocked, default: mocked };
});
