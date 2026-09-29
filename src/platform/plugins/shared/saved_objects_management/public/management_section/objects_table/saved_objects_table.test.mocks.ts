/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { LoDashStatic } from 'lodash';

export const saveAsMock = vi.fn();
vi.doMock('@elastic/filesaver', () => ({
  saveAs: saveAsMock,
}));

vi.doMock('lodash', async () => {
  // lodash is CommonJS: its namespace only exposes `default`, so spreading it would drop every helper.
  const { default: original } = await vi.importActual<{ default: LoDashStatic }>('lodash');

  const mocked = {
    ...original,
    debounce: (func: Function) => {
      function debounced(this: any, ...args: any[]) {
        return func.apply(this, args);
      }
      return debounced;
    },
  };
  return { ...mocked, default: mocked };
});

export const findObjectsMock = vi.fn();
vi.doMock('../../lib/find_objects', () => ({
  findObjects: findObjectsMock,
}));

export const fetchExportObjectsMock = vi.fn();
vi.doMock('../../lib/fetch_export_objects', () => ({
  fetchExportObjects: fetchExportObjectsMock,
}));

export const fetchExportByTypeAndSearchMock = vi.fn();
vi.doMock('../../lib/fetch_export_by_type_and_search', () => ({
  fetchExportByTypeAndSearch: fetchExportByTypeAndSearchMock,
}));

export const extractExportDetailsMock = vi.fn();
vi.doMock('../../lib/extract_export_details', () => ({
  extractExportDetails: extractExportDetailsMock,
}));

vi.doMock('./components/header', () => ({
  Header: () => 'Header',
}));

export const getSavedObjectCountsMock = vi.fn();
vi.doMock('../../lib/get_saved_object_counts', () => ({
  getSavedObjectCounts: getSavedObjectCountsMock,
}));

export const getRelationshipsMock = vi.fn();
vi.doMock('../../lib/get_relationships', () => ({
  getRelationships: getRelationshipsMock,
}));

export const bulkGetObjectsMock = vi.fn();
vi.doMock('../../lib/bulk_get_objects', () => ({
  bulkGetObjects: bulkGetObjectsMock,
}));

export const bulkDeleteObjectsMock = vi.fn();
vi.doMock('../../lib/bulk_delete_objects', () => ({
  bulkDeleteObjects: bulkDeleteObjectsMock,
}));
