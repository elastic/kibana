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

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
}));

jest.mock('../../../../../lib/import_file', () => ({
  importFile: jest.fn(),
}));

jest.mock('../../../../../lib/resolve_saved_objects', () => ({
  resolveSavedObjects: jest.fn(),
  resolveSavedSearches: jest.fn(),
  resolveIndexPatternConflicts: jest.fn(),
  saveObjects: jest.fn(),
}));

const defaultProps = {
  close: jest.fn(),
  done: jest.fn(),
  services: [],
  newIndexPatternUrl: '',
  indexPatterns: {
    getFields: jest.fn().mockImplementation(() => [{ id: '1' }, { id: '2' }]),
  },
};

const mockFile = {
  path: '/home/foo.txt',
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

  it('should handle invalid files', async () => {
    const { importFile } = require('../../../../../lib/import_file');
    const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    importFile.mockImplementation(() => {
      throw new Error('foobar');
    });

    await component.instance().import();
    expect(component.state('error')).toBe('The file could not be processed.');

    importFile.mockImplementation(() => ({
      invalid: true,
    }));

    await component.instance().import();
    expect(component.state('error')).toBe(
      'Saved objects file format is invalid and cannot be imported.'
    );
  });

  describe('conflicts', () => {
    const { importFile } = require('../../../../../lib/import_file');
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
      importFile.mockImplementation(() => mockData);
      resolveSavedObjects.mockImplementation(() => ({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importedObjectCount: 2,
      }));
    });

    it('should figure out conflicts', async () => {
      const component = shallowWithIntl(<Flyout.WrappedComponent {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: mockFile });
      await component.instance().import();

      expect(importFile).toHaveBeenCalledWith(mockFile);
      // Remove the last element from data since it should be filtered out
      expect(resolveSavedObjects).toHaveBeenCalledWith(
        mockData.slice(0, 2).map((doc) => ({ ...doc, _migrationVersion: {} })),
        true,
        defaultProps.services,
        defaultProps.indexPatterns
      );

      expect(component.state()).toMatchObject({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importCount: 2,
        isLoading: false,
        wasImportSuccessful: false,
        conflicts: [
          {
            existingIndexPatternId: 'MyIndexPattern*',
            newIndexPatternId: undefined,
            list: [
              {
                id: 'MyIndexPattern*',
                name: 'MyIndexPattern*',
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

      component.setState({ file: mockFile });
      await component.instance().import();

      // Ensure it looks right
      component.update();
      expect(component).toMatchSnapshot();

      // Ensure we can change the resolution
      component
        .instance()
        .onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      expect(component.state('conflicts')[0].newIndexPatternId).toBe('2');

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

      component.setState({ file: mockFile });

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

      expect(component.state('error')).toEqual('foobar');
      expect(component.find('EuiFlyoutBody EuiCallOut')).toMatchSnapshot();
    });
  });
});
