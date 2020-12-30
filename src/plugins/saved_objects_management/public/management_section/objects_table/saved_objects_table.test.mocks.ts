/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
