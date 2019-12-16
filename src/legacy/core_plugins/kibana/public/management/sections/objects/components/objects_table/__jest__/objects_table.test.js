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
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';
import { mockManagementPlugin } from '../../../../../../../../management/public/np_ready/mocks';
import { Query } from '@elastic/eui';

import { ObjectsTable, POSSIBLE_TYPES } from '../objects_table';
import { Flyout } from '../components/flyout/';
import { Relationships } from '../components/relationships/';
import { findObjects } from '../../../lib';
import { extractExportDetails } from '../../../lib/extract_export_details';

jest.mock('ui/kfetch', () => ({ kfetch: jest.fn() }));

jest.mock('../../../../../../../../management/public/legacy', () => ({
  setup: mockManagementPlugin.createSetupContract(),
  start: mockManagementPlugin.createStartContract(),
}));

jest.mock('../../../lib/find_objects', () => ({
  findObjects: jest.fn(),
}));

jest.mock('../components/header', () => ({
  Header: () => 'Header',
}));

jest.mock('ui/chrome', () => ({
  addBasePath: () => '',
  getInjected: () => ['index-pattern', 'visualization', 'dashboard', 'search'],
}));

jest.mock('../../../lib/fetch_export_objects', () => ({
  fetchExportObjects: jest.fn(),
}));

jest.mock('../../../lib/fetch_export_by_type_and_search', () => ({
  fetchExportByTypeAndSearch: jest.fn(),
}));

jest.mock('../../../lib/extract_export_details', () => ({
  extractExportDetails: jest.fn(),
}));

jest.mock('../../../lib/get_saved_object_counts', () => ({
  getSavedObjectCounts: jest.fn().mockImplementation(() => {
    return {
      'index-pattern': 0,
      visualization: 0,
      dashboard: 0,
      search: 0,
    };
  }),
}));

jest.mock('@elastic/filesaver', () => ({
  saveAs: jest.fn(),
}));

jest.mock('../../../lib/get_relationships', () => ({
  getRelationships: jest.fn(),
}));

jest.mock('ui/notify', () => ({}));

const allSavedObjects = [
  {
    id: '1',
    type: 'index-pattern',
    attributes: {
      title: `MyIndexPattern*`,
    },
  },
  {
    id: '2',
    type: 'search',
    attributes: {
      title: `MySearch`,
    },
  },
  {
    id: '3',
    type: 'dashboard',
    attributes: {
      title: `MyDashboard`,
    },
  },
  {
    id: '4',
    type: 'visualization',
    attributes: {
      title: `MyViz`,
    },
  },
];

const $http = () => {};
$http.post = jest.fn().mockImplementation(() => []);
const defaultProps = {
  goInspectObject: () => {},
  confirmModalPromise: jest.fn(),
  savedObjectsClient: {
    find: jest.fn(),
    bulkGet: jest.fn(),
  },
  indexPatterns: {
    clearCache: jest.fn(),
  },
  $http,
  basePath: '',
  newIndexPatternUrl: '',
  kbnIndex: '',
  services: [],
  uiCapabilities: {
    savedObjectsManagement: {
      read: true,
      edit: false,
      delete: false,
    },
  },
  canDelete: true,
};

beforeEach(() => {
  findObjects.mockImplementation(() => ({
    total: 4,
    savedObjects: [
      {
        id: '1',
        type: 'index-pattern',
        meta: {
          title: `MyIndexPattern*`,
          icon: 'indexPatternApp',
          editUrl: '#/management/kibana/index_patterns/1',
          inAppUrl: {
            path: '/management/kibana/index_patterns/1',
            uiCapabilitiesPath: 'management.kibana.index_patterns',
          },
        },
      },
      {
        id: '2',
        type: 'search',
        meta: {
          title: `MySearch`,
          icon: 'search',
          editUrl: '#/management/kibana/objects/savedSearches/2',
          inAppUrl: {
            path: '/discover/2',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      },
      {
        id: '3',
        type: 'dashboard',
        meta: {
          title: `MyDashboard`,
          icon: 'dashboardApp',
          editUrl: '#/management/kibana/objects/savedDashboards/3',
          inAppUrl: {
            path: '/dashboard/3',
            uiCapabilitiesPath: 'dashboard.show',
          },
        },
      },
      {
        id: '4',
        type: 'visualization',
        meta: {
          title: `MyViz`,
          icon: 'visualizeApp',
          editUrl: '#/management/kibana/objects/savedVisualizations/4',
          inAppUrl: {
            path: '/visualize/edit/4',
            uiCapabilitiesPath: 'visualize.show',
          },
        },
      },
    ],
  }));
});

let addDangerMock;
let addSuccessMock;
let addWarningMock;

describe('ObjectsTable', () => {
  beforeEach(() => {
    defaultProps.savedObjectsClient.find.mockClear();
    extractExportDetails.mockReset();
    // mock _.debounce to fire immediately with no internal timer
    require('lodash').debounce = func => {
      function debounced(...args) {
        return func.apply(this, args);
      }
      return debounced;
    };
    addDangerMock = jest.fn();
    addSuccessMock = jest.fn();
    addWarningMock = jest.fn();
    require('ui/notify').toastNotifications = {
      addDanger: addDangerMock,
      addSuccess: addSuccessMock,
      addWarning: addWarningMock,
    };
  });

  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <ObjectsTable {...defaultProps} perPageConfig={15} />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should add danger toast when find fails', async () => {
    findObjects.mockImplementation(() => {
      throw new Error('Simulated find error');
    });
    const component = shallowWithI18nProvider(
      <ObjectsTable {...defaultProps} perPageConfig={15} />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(addDangerMock).toHaveBeenCalled();
  });

  describe('export', () => {
    it('should export selected objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ];

      const mockSavedObjects = mockSelectedSavedObjects.map(obj => ({
        _id: obj.id,
        _source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        })),
      };

      const { fetchExportObjects } = require('../../../lib/fetch_export_objects');

      const component = shallowWithI18nProvider(
        <ObjectsTable {...defaultProps} savedObjectsClient={mockSavedObjectsClient} />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport(true);

      expect(fetchExportObjects).toHaveBeenCalledWith(mockSelectedSavedObjects, true);
      expect(addSuccessMock).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });

    it('should display a warning is export contains missing references', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ];

      const mockSavedObjects = mockSelectedSavedObjects.map(obj => ({
        _id: obj.id,
        _source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        })),
      };

      const { fetchExportObjects } = require('../../../lib/fetch_export_objects');
      extractExportDetails.mockImplementation(() => ({
        exportedCount: 2,
        missingRefCount: 1,
        missingReferences: [{ id: '7', type: 'visualisation' }],
      }));

      const component = shallowWithI18nProvider(
        <ObjectsTable {...defaultProps} savedObjectsClient={mockSavedObjectsClient} />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport(true);

      expect(fetchExportObjects).toHaveBeenCalledWith(mockSelectedSavedObjects, true);
      expect(addWarningMock).toHaveBeenCalledWith({
        title:
          'Your file is downloading in the background. ' +
          'Some related objects could not be found. ' +
          'Please see the last line in the exported file for a list of missing objects.',
      });
    });

    it('should allow the user to choose when exporting all', async () => {
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.find('Header').prop('onExportAll')();
      component.update();

      expect(component.find('EuiModal')).toMatchSnapshot();
    });

    it('should export all', async () => {
      const {
        fetchExportByTypeAndSearch,
      } = require('../../../lib/fetch_export_by_type_and_search');
      const { saveAs } = require('@elastic/filesaver');
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set up mocks
      const blob = new Blob([JSON.stringify(allSavedObjects)], { type: 'application/ndjson' });
      fetchExportByTypeAndSearch.mockImplementation(() => blob);

      await component.instance().onExportAll();

      expect(fetchExportByTypeAndSearch).toHaveBeenCalledWith(POSSIBLE_TYPES, undefined, true);
      expect(saveAs).toHaveBeenCalledWith(blob, 'export.ndjson');
      expect(addSuccessMock).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });

    it('should export all, accounting for the current search criteria', async () => {
      const {
        fetchExportByTypeAndSearch,
      } = require('../../../lib/fetch_export_by_type_and_search');
      const { saveAs } = require('@elastic/filesaver');
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      component.instance().onQueryChange({
        query: Query.parse('test'),
      });

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set up mocks
      const blob = new Blob([JSON.stringify(allSavedObjects)], { type: 'application/ndjson' });
      fetchExportByTypeAndSearch.mockImplementation(() => blob);

      await component.instance().onExportAll();

      expect(fetchExportByTypeAndSearch).toHaveBeenCalledWith(POSSIBLE_TYPES, 'test*', true);
      expect(saveAs).toHaveBeenCalledWith(blob, 'export.ndjson');
      expect(addSuccessMock).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });
  });

  describe('import', () => {
    it('should show the flyout', async () => {
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().showImportFlyout();
      component.update();

      expect(component.find(Flyout)).toMatchSnapshot();
    });

    it('should hide the flyout', async () => {
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

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

      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      await component.instance().getRelationships('search', '1');
      const savedObjectTypes = ['index-pattern', 'visualization', 'dashboard', 'search'];
      expect(getRelationships).toHaveBeenCalledWith(
        'search',
        '1',
        savedObjectTypes,
        defaultProps.$http,
        defaultProps.basePath
      );
    });

    it('should show the flyout', async () => {
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().onShowRelationships({
        id: '2',
        type: 'search',
        meta: {
          title: `MySearch`,
          icon: 'search',
          editUrl: '#/management/kibana/objects/savedSearches/2',
          inAppUrl: {
            path: '/discover/2',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      });
      component.update();

      expect(component.find(Relationships)).toMatchSnapshot();
      expect(component.state('relationshipObject')).toEqual({
        id: '2',
        type: 'search',
        meta: {
          title: 'MySearch',
          editUrl: '#/management/kibana/objects/savedSearches/2',
          icon: 'search',
          inAppUrl: {
            path: '/discover/2',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      });
    });

    it('should hide the flyout', async () => {
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

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
      const component = shallowWithI18nProvider(<ObjectsTable {...defaultProps} />);

      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern', title: 'Title 1' },
        { id: '3', type: 'dashboard', title: 'Title 2' },
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
        { id: '3', type: 'dashboard' },
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

      const component = shallowWithI18nProvider(
        <ObjectsTable {...defaultProps} savedObjectsClient={mockSavedObjectsClient} />
      );

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().delete();

      expect(defaultProps.indexPatterns.clearCache).toHaveBeenCalled();
      expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith(mockSelectedSavedObjects);
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        mockSavedObjects[0].type,
        mockSavedObjects[0].id
      );
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        mockSavedObjects[1].type,
        mockSavedObjects[1].id
      );
      expect(component.state('selectedSavedObjects').length).toBe(0);
    });
  });
});
