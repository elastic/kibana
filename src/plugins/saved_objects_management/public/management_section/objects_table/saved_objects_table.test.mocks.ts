/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const saveAsMock = jest.fn();
jest.doMock('@elastic/filesaver', () => ({
  saveAs: saveAsMock,
}));

jest.doMock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (func: Function) => {
      function debounced(this: any, ...args: any[]) {
        return func.apply(this, args);
      }
      return debounced;
    },
  };
});

export const findObjectsMock = jest.fn();
jest.doMock('../../lib/find_objects', () => ({
  findObjects: findObjectsMock,
}));

export const fetchExportObjectsMock = jest.fn();
jest.doMock('../../lib/fetch_export_objects', () => ({
  fetchExportObjects: fetchExportObjectsMock,
}));

export const fetchExportByTypeAndSearchMock = jest.fn();
jest.doMock('../../lib/fetch_export_by_type_and_search', () => ({
  fetchExportByTypeAndSearch: fetchExportByTypeAndSearchMock,
}));

export const extractExportDetailsMock = jest.fn();
jest.doMock('../../lib/extract_export_details', () => ({
  extractExportDetails: extractExportDetailsMock,
}));

jest.doMock('./components/header', () => ({
  Header: () => 'Header',
}));

export const getSavedObjectCountsMock = jest.fn();
jest.doMock('../../lib/get_saved_object_counts', () => ({
  getSavedObjectCounts: getSavedObjectCountsMock,
}));

export const getRelationshipsMock = jest.fn();
jest.doMock('../../lib/get_relationships', () => ({
  getRelationships: getRelationshipsMock,
}));

export const bulkGetObjectsMock = jest.fn();
jest.doMock('../../lib/bulk_get_objects', () => ({
  bulkGetObjects: bulkGetObjectsMock,
}));

export const bulkDeleteObjectsMock = jest.fn();
jest.doMock('../../lib/bulk_delete_objects', () => ({
  bulkDeleteObjects: bulkDeleteObjectsMock,
}));
