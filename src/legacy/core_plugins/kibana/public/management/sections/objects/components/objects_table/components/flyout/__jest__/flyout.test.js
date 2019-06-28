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

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { Flyout } from '../flyout';

jest.mock('ui/kfetch', () => ({ kfetch: jest.fn() }));

jest.mock('ui/errors', () => ({
  SavedObjectNotFound: class SavedObjectNotFound extends Error {
    constructor(options) {
      super();
      for (const option in options) {
        if (options.hasOwnProperty(option)) {
          this[option] = options[option];
        }
      }
    }
  },
}));

jest.mock('../../../../../lib/import_file', () => ({
  importFile: jest.fn(),
}));

jest.mock('../../../../../lib/resolve_import_errors', () => ({
  resolveImportErrors: jest.fn(),
}));

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
  getInjected: () => ['index-pattern', 'visualization', 'dashboard', 'search'],
}));

jest.mock('../../../../../lib/import_legacy_file', () => ({
  importLegacyFile: jest.fn(),
}));

jest.mock('../../../../../lib/resolve_saved_objects', () => ({
  resolveSavedObjects: jest.fn(),
  resolveSavedSearches: jest.fn(),
  resolveIndexPatternConflicts: jest.fn(),
  saveObjects: jest.fn(),
}));

jest.mock('ui/notify', () => ({}));

const defaultProps = {
  close: jest.fn(),
  done: jest.fn(),
  services: [],
  newIndexPatternUrl: '',
  getConflictResolutions: jest.fn(),
  confirmModalPromise: jest.fn(),
  indexPatterns: {
    getFields: jest.fn().mockImplementation(() => [{ id: '1' }, { id: '2' }]),
  },
};

const mockFile = {
  name: 'foo.ndjson',
  path: '/home/foo.ndjson',
};
const legacyMockFile = {
  name: 'foo.json',
  path: '/home/foo.json',
};

describe('Flyout', () => {
  it('should render import step', async () => {
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should toggle the overwrite all control', async () => {
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component.state('isOverwriteAllChecked')).toBe(true);
    component.find('EuiSwitch').simulate('change');
    expect(component.state('isOverwriteAllChecked')).toBe(false);
  });

  it('should allow picking a file', async () => {
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component.state('file')).toBe(undefined);
    component.find('EuiFilePicker').simulate('change', [mockFile]);
    expect(component.state('file')).toBe(mockFile);
  });

  it('should allow removing a file', async () => {
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await Promise.resolve();
    // Ensure the state changes are reflected
    component.update();

    expect(component.state('file')).toBe(undefined);
    component.find('EuiFilePicker').simulate('change', [mockFile]);
    expect(component.state('file')).toBe(mockFile);
    component.find('EuiFilePicker').simulate('change', []);
    expect(component.state('file')).toBe(undefined);
  });

  it('should handle invalid files', async () => {
    const { importLegacyFile } = require('../../../../../lib/import_legacy_file');
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    importLegacyFile.mockImplementation(() => {
      throw new Error('foobar');
    });

    await component.instance().legacyImport();
    expect(component.state('error')).toBe('The file could not be processed.');

    importLegacyFile.mockImplementation(() => ({
      invalid: true,
    }));

    await component.instance().legacyImport();
    expect(component.state('error')).toBe(
      'Saved objects file format is invalid and cannot be imported.'
    );
  });

  describe('conflicts', () => {
    const { importFile } = require('../../../../../lib/import_file');
    const { resolveImportErrors } = require('../../../../../lib/resolve_import_errors');

    beforeEach(() => {
      importFile.mockImplementation(() => ({
        success: false,
        successCount: 0,
        errors: [
          {
            id: '1',
            type: 'visualization',
            title: 'My Visualization',
            error: {
              type: 'missing_references',
              references: [
                {
                  id: 'MyIndexPattern*',
                  type: 'index-pattern',
                },
              ],
            }
          },
        ],
      }));
      resolveImportErrors.mockImplementation(() => ({
        status: 'success',
        importCount: 1,
        failedImports: [],
      }));
    });

    it('should figure out unmatchedReferences', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: mockFile, isLegacyFile: false });
      await component.instance().import();

      expect(importFile).toHaveBeenCalledWith(mockFile, true);
      expect(component.state()).toMatchObject({
        conflictedIndexPatterns: undefined,
        conflictedSavedObjectsLinkedToSavedSearches: undefined,
        conflictedSearchDocs: undefined,
        importCount: 0,
        status: 'idle',
        error: undefined,
        unmatchedReferences: [
          {
            existingIndexPatternId: 'MyIndexPattern*',
            newIndexPatternId: undefined,
            list: [
              {
                id: '1',
                type: 'visualization',
                title: 'My Visualization',
              },
            ],
          },
        ],
      });
    });

    it('should allow conflict resolution', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: mockFile, isLegacyFile: false });
      await component.instance().import();

      // Ensure it looks right
      component.update();
      expect(component).toMatchSnapshot();

      // Ensure we can change the resolution
      component
        .instance()
        .onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      expect(component.state('unmatchedReferences')[0].newIndexPatternId).toBe('2');

      // Let's resolve now
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      expect(resolveImportErrors).toMatchSnapshot();
    });

    it('should handle errors', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      resolveImportErrors.mockImplementation(() => ({
        status: 'success',
        importCount: 0,
        failedImports: [
          {
            obj: {
              type: 'visualization',
              id: '1',
            },
            error: {
              type: 'unknown',
            },
          },
        ],
      }));

      component.setState({ file: mockFile, isLegacyFile: false });

      // Go through the import flow
      await component.instance().import();
      component.update();
      // Set a resolution
      component
        .instance()
        .onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));

      expect(component.state('failedImports')).toEqual([
        {
          error: {
            type: 'unknown',
          },
          obj: {
            id: '1',
            type: 'visualization',
          },
        },
      ]);
      expect(component.find('EuiFlyoutBody EuiCallOut')).toMatchSnapshot();
    });
  });

  describe('errors', () => {
    const { importFile } = require('../../../../../lib/import_file');
    const { resolveImportErrors } = require('../../../../../lib/resolve_import_errors');

    it('should display unsupported type errors properly', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await Promise.resolve();
      // Ensure the state changes are reflected
      component.update();

      importFile.mockImplementation(() => ({
        success: false,
        successCount: 0,
        errors: [
          {
            id: '1',
            type: 'wigwags',
            title: 'My Title',
            error: {
              type: 'unsupported_type',
            }
          },
        ],
      }));
      resolveImportErrors.mockImplementation(() => ({
        status: 'success',
        importCount: 0,
        failedImports: [
          {
            error: {
              type: 'unsupported_type',
            },
            obj: {
              id: '1',
              type: 'wigwags',
              title: 'My Title',
            },
          },
        ],
      }));

      component.setState({ file: mockFile, isLegacyFile: false });

      // Go through the import flow
      await component.instance().import();
      component.update();

      // Ensure all promises resolve
      await Promise.resolve();

      expect(component.state('status')).toBe('success');
      expect(component.state('failedImports')).toEqual([
        {
          error: {
            type: 'unsupported_type',
          },
          obj: {
            id: '1',
            type: 'wigwags',
            title: 'My Title',
          },
        },
      ]);
      expect(component.find('EuiFlyout EuiCallOut')).toMatchSnapshot();
    });
  });

  describe('legacy conflicts', () => {
    const { importLegacyFile } = require('../../../../../lib/import_legacy_file');
    const {
      resolveSavedObjects,
      resolveSavedSearches,
      resolveIndexPatternConflicts,
      saveObjects,
    } = require('../../../../../lib/resolve_saved_objects');

    const mockData = [
      {
        _id: '1',
        _type: 'search',
      },
      {
        _id: '2',
        _type: 'index-pattern',
      },
      {
        _id: '3',
        _type: 'invalid',
      },
    ];

    const mockConflictedIndexPatterns = [
      {
        doc: {
          _type: 'index-pattern',
          _id: '1',
          _source: {
            title: 'MyIndexPattern*',
          },
        },
        obj: {
          searchSource: {
            getOwnField: () => 'MyIndexPattern*',
          },
        },
      },
    ];

    const mockConflictedSavedObjectsLinkedToSavedSearches = [2];
    const mockConflictedSearchDocs = [3];

    beforeEach(() => {
      importLegacyFile.mockImplementation(() => mockData);
      resolveSavedObjects.mockImplementation(() => ({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importedObjectCount: 2,
        confirmModalPromise: () => {},
      }));
    });

    it('should figure out unmatchedReferences', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: legacyMockFile, isLegacyFile: true });
      await component.instance().legacyImport();

      expect(importLegacyFile).toHaveBeenCalledWith(legacyMockFile);
      // Remove the last element from data since it should be filtered out
      expect(resolveSavedObjects).toHaveBeenCalledWith(
        mockData.slice(0, 2).map((doc) => ({ ...doc, _migrationVersion: {} })),
        true,
        defaultProps.services,
        defaultProps.indexPatterns,
        defaultProps.confirmModalPromise,
      );

      expect(component.state()).toMatchObject({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importCount: 2,
        status: 'idle',
        error: undefined,
        unmatchedReferences: [
          {
            existingIndexPatternId: 'MyIndexPattern*',
            newIndexPatternId: undefined,
            list: [
              {
                id: 'MyIndexPattern*',
                title: 'MyIndexPattern*',
                type: 'index-pattern',
              },
            ],
          },
        ],
      });
    });

    it('should allow conflict resolution', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: legacyMockFile, isLegacyFile: true });
      await component.instance().legacyImport();

      // Ensure it looks right
      component.update();
      expect(component).toMatchSnapshot();

      // Ensure we can change the resolution
      component
        .instance()
        .onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      expect(component.state('unmatchedReferences')[0].newIndexPatternId).toBe('2');

      // Let's resolve now
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      expect(resolveIndexPatternConflicts).toHaveBeenCalledWith(
        component.instance().resolutions,
        mockConflictedIndexPatterns,
        true
      );
      expect(saveObjects).toHaveBeenCalledWith(
        mockConflictedSavedObjectsLinkedToSavedSearches,
        true
      );
      expect(resolveSavedSearches).toHaveBeenCalledWith(
        mockConflictedSearchDocs,
        defaultProps.services,
        defaultProps.indexPatterns,
        true
      );
    });

    it('should handle errors', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      resolveIndexPatternConflicts.mockImplementation(() => {
        throw new Error('foobar');
      });

      component.setState({ file: legacyMockFile, isLegacyFile: true });

      // Go through the import flow
      await component.instance().legacyImport();
      component.update();
      // Set a resolution
      component
        .instance()
        .onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));

      expect(component.state('error')).toEqual('foobar');
      expect(component.find('EuiFlyoutBody EuiCallOut')).toMatchSnapshot();
    });
  });
});
