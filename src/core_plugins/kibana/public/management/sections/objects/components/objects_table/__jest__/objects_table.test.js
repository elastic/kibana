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

import { ObjectsTable, INCLUDED_TYPES } from '../objects_table';
import { Flyout } from '../components/flyout/';
import { Relationships } from '../components/relationships/';

jest.mock('../components/header', () => ({
  Header: () => 'Header',
}));

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
  addBasePath: () => ''
}));

jest.mock('../../../../indices/create_index_pattern_wizard/lib/ensure_minimum_time', () => ({
  ensureMinimumTime: async promises => {
    if (Array.isArray(promises)) {
      return await Promise.all(promises);
    }
    return await promises;
  },
}));

jest.mock('../../../lib/retrieve_and_export_docs', () => ({
  retrieveAndExportDocs: jest.fn(),
}));

jest.mock('../../../lib/scan_all_types', () => ({
  scanAllTypes: jest.fn(),
}));

jest.mock('../../../lib/get_saved_object_counts', () => ({
  getSavedObjectCounts: jest.fn().mockImplementation(() => {
    return {
      'index-pattern': 0,
      'visualization': 0,
      'dashboard': 0,
      'search': 0,
    };
  })
}));

jest.mock('../../../lib/save_to_file', () => ({
  saveToFile: jest.fn(),
}));

jest.mock('../../../lib/get_relationships', () => ({
  getRelationships: jest.fn(),
}));

const allSavedObjects = [
  {
    id: '1',
    type: 'index-pattern',
    attributes: {
      title: `MyIndexPattern*`
    }
  },
  {
    id: '2',
    type: 'search',
    attributes: {
      title: `MySearch`
    }
  },
  {
    id: '3',
    type: 'dashboard',
    attributes: {
      title: `MyDashboard`
    }
  },
  {
    id: '4',
    type: 'visualization',
    attributes: {
      title: `MyViz`
    }
  },
];

const $http = () => {};
$http.post = jest.fn().mockImplementation(() => ([]));
const defaultProps = {
  savedObjectsClient: {
    find: jest.fn().mockImplementation(({ type }) => {
      // We pass in a single type when fetching counts
      if (type && !Array.isArray(type)) {
        return {
          total: 1,
          savedObjects: [
            {
              id: '1',
              type,
              attributes: {
                title: `Title${type}`
              }
            },
          ]
        };
      }

      return {
        total: allSavedObjects.length,
        savedObjects: allSavedObjects,
      };
    }),
  },
  indexPatterns: {
    cache: {
      clearAll: jest.fn(),
    }
  },
  $http,
  basePath: '',
  newIndexPatternUrl: '',
  kbnIndex: '',
  services: [],
  getEditUrl: () => {},
  goInApp: () => {},
};

describe('ObjectsTable', () => {
  beforeEach(() => {
    defaultProps.savedObjectsClient.find.mockClear();
  });

  it('should render normally', async () => {
    const component = shallowWithIntl(
      <ObjectsTable.WrappedComponent
        {...defaultProps}
        perPageConfig={15}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('export', () => {
    it('should export selected objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' }
      ];

      const mockSavedObjects = mockSelectedSavedObjects.map(obj => ({
        _id: obj.id,
        _type: obj._type,
        _source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        }))
      };

      const { retrieveAndExportDocs } = require('../../../lib/retrieve_and_export_docs');

      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
          savedObjectsClient={mockSavedObjectsClient}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport();

      expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith(mockSelectedSavedObjects);
      expect(retrieveAndExportDocs).toHaveBeenCalledWith(mockSavedObjects, mockSavedObjectsClient);
    });

    it('should allow the user to choose when exporting all', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.find('Header').prop('onExportAll')();
      component.update();

      expect(component.find('EuiConfirmModal')).toMatchSnapshot();
    });

    it('should export all', async () => {
      const { scanAllTypes } = require('../../../lib/scan_all_types');
      const { saveToFile } = require('../../../lib/save_to_file');
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set up mocks
      scanAllTypes.mockImplementation(() => allSavedObjects);

      await component.instance().onExportAll();

      expect(scanAllTypes).toHaveBeenCalledWith(defaultProps.$http, INCLUDED_TYPES);
      expect(saveToFile).toHaveBeenCalledWith(JSON.stringify(allSavedObjects, null, 2));
    });
  });

  describe('import', () => {
    it('should show the flyout', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().showImportFlyout();
      component.update();

      expect(component.find(Flyout)).toMatchSnapshot();
    });

    it('should hide the flyout', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().hideImportFlyout();
      component.update();

      expect(component.find(Flyout).length).toBe(0);
    });
  });

  describe('relationships', () => {
    it('should fetch relationships', async () => {
      const { getRelationships } = require('../../../lib/get_relationships');

      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      await component.instance().getRelationships('search', '1');
      expect(getRelationships).toHaveBeenCalledWith('search', '1', defaultProps.$http, defaultProps.basePath);
    });

    it('should show the flyout', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().onShowRelationships('1', 'search', 'MySearch');
      component.update();

      expect(component.find(Relationships)).toMatchSnapshot();
      expect(component.state('relationshipId')).toBe('1');
      expect(component.state('relationshipType')).toBe('search');
      expect(component.state('relationshipTitle')).toBe('MySearch');
    });

    it('should hide the flyout', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().onHideRelationships();
      component.update();

      expect(component.find(Relationships).length).toBe(0);
      expect(component.state('relationshipId')).toBe(undefined);
      expect(component.state('relationshipType')).toBe(undefined);
      expect(component.state('relationshipTitle')).toBe(undefined);
    });
  });

  describe('delete', () => {
    it('should show a confirm modal', async () => {
      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
        />
      );

      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' }
      ];

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);
      await component.instance().onDelete();
      component.update();

      expect(component.find('EuiConfirmModal')).toMatchSnapshot();
    });

    it('should delete selected objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' }
      ];

      const mockSavedObjects = mockSelectedSavedObjects.map(obj => ({
        id: obj.id,
        type: obj.type,
        source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        })),
        delete: jest.fn(),
      };

      const component = shallowWithIntl(
        <ObjectsTable.WrappedComponent
          {...defaultProps}
          savedObjectsClient={mockSavedObjectsClient}
        />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().delete();

      expect(defaultProps.indexPatterns.cache.clearAll).toHaveBeenCalled();
      expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith(mockSelectedSavedObjects);
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(mockSavedObjects[0].type, mockSavedObjects[0].id);
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(mockSavedObjects[1].type, mockSavedObjects[1].id);
      expect(component.state('selectedSavedObjects').length).toBe(0);
    });
  });
});
