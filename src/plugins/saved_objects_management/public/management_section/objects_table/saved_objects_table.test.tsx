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

import {
  extractExportDetailsMock,
  fetchExportByTypeAndSearchMock,
  fetchExportObjectsMock,
  findObjectsMock,
  getRelationshipsMock,
  getSavedObjectCountsMock,
  saveAsMock,
} from './saved_objects_table.test.mocks';

import React from 'react';
import { Query } from '@elastic/eui';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';
import {
  httpServiceMock,
  overlayServiceMock,
  notificationServiceMock,
  savedObjectsServiceMock,
  applicationServiceMock,
} from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { serviceRegistryMock } from '../../services/service_registry.mock';
import { actionServiceMock } from '../../services/action_service.mock';
import {
  SavedObjectsTable,
  SavedObjectsTableProps,
  SavedObjectsTableState,
} from './saved_objects_table';
import { Flyout, Relationships } from './components';
import { SavedObjectWithMetadata } from '../../types';

const allowedTypes = ['index-pattern', 'visualization', 'dashboard', 'search'];

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

describe('SavedObjectsTable', () => {
  let defaultProps: SavedObjectsTableProps;
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;
  let savedObjects: ReturnType<typeof savedObjectsServiceMock.createStartContract>;
  let search: ReturnType<typeof dataPluginMock.createStartContract>['search'];

  const shallowRender = (overrides: Partial<SavedObjectsTableProps> = {}) => {
    return (shallowWithI18nProvider(
      <SavedObjectsTable {...defaultProps} {...overrides} />
    ) as unknown) as ShallowWrapper<
      SavedObjectsTableProps,
      SavedObjectsTableState,
      SavedObjectsTable
    >;
  };

  beforeEach(() => {
    extractExportDetailsMock.mockReset();

    http = httpServiceMock.createStartContract();
    overlays = overlayServiceMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();
    savedObjects = savedObjectsServiceMock.createStartContract();
    search = dataPluginMock.createStartContract().search;

    const applications = applicationServiceMock.createStartContract();
    applications.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      savedObjectsManagement: {
        read: true,
        edit: false,
        delete: false,
      },
    };

    http.post.mockResolvedValue([]);

    getSavedObjectCountsMock.mockReturnValue({
      'index-pattern': 0,
      visualization: 0,
      dashboard: 0,
      search: 0,
    });

    defaultProps = {
      allowedTypes,
      serviceRegistry: serviceRegistryMock.create(),
      actionRegistry: actionServiceMock.createStart(),
      savedObjectsClient: savedObjects.client,
      indexPatterns: dataPluginMock.createStartContract().indexPatterns,
      http,
      overlays,
      notifications,
      applications,
      perPageConfig: 15,
      goInspectObject: () => {},
      canGoInApp: () => true,
      search,
    };

    findObjectsMock.mockImplementation(() => ({
      total: 4,
      savedObjects: [
        {
          id: '1',
          type: 'index-pattern',
          meta: {
            title: `MyIndexPattern*`,
            icon: 'indexPatternApp',
            editUrl: '#/management/kibana/indexPatterns/patterns/1',
            inAppUrl: {
              path: '/management/kibana/indexPatterns/patterns/1',
              uiCapabilitiesPath: 'management.kibana.indexPatterns',
            },
          },
        },
        {
          id: '2',
          type: 'search',
          meta: {
            title: `MySearch`,
            icon: 'search',
            editUrl: '/management/kibana/objects/savedSearches/2',
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
            editUrl: '/management/kibana/objects/savedDashboards/3',
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
            editUrl: '/management/kibana/objects/savedVisualizations/4',
            inAppUrl: {
              path: '/edit/4',
              uiCapabilitiesPath: 'visualize.show',
            },
          },
        },
      ],
    }));
  });

  it('should render normally', async () => {
    const component = shallowRender({ perPageConfig: 15 });

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should add danger toast when find fails', async () => {
    findObjectsMock.mockImplementation(() => {
      throw new Error('Simulated find error');
    });
    const component = shallowRender({ perPageConfig: 15 });

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
  });

  describe('export', () => {
    it('should export selected objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        _id: obj.id,
        _source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        })),
      };

      const component = shallowRender({ savedObjectsClient: mockSavedObjectsClient });

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport(true);

      expect(fetchExportObjectsMock).toHaveBeenCalledWith(http, mockSelectedSavedObjects, true);
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });

    it('should display a warning is export contains missing references', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        _id: obj.id,
        _source: {},
      }));

      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        bulkGet: jest.fn().mockImplementation(() => ({
          savedObjects: mockSavedObjects,
        })),
      };

      extractExportDetailsMock.mockImplementation(() => ({
        exportedCount: 2,
        missingRefCount: 1,
        missingReferences: [{ id: '7', type: 'visualisation' }],
      }));

      const component = shallowRender({ savedObjectsClient: mockSavedObjectsClient });

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport(true);

      expect(fetchExportObjectsMock).toHaveBeenCalledWith(http, mockSelectedSavedObjects, true);
      expect(notifications.toasts.addWarning).toHaveBeenCalledWith({
        title:
          'Your file is downloading in the background. ' +
          'Some related objects could not be found. ' +
          'Please see the last line in the exported file for a list of missing objects.',
      });
    });

    it('should allow the user to choose when exporting all', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      (component.find('Header') as any).prop('onExportAll')();
      component.update();

      expect(component.find('EuiModal')).toMatchSnapshot();
    });

    it('should export all', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set up mocks
      const blob = new Blob([JSON.stringify(allSavedObjects)], { type: 'application/ndjson' });
      fetchExportByTypeAndSearchMock.mockImplementation(() => blob);

      await component.instance().onExportAll();

      expect(fetchExportByTypeAndSearchMock).toHaveBeenCalledWith(
        http,
        allowedTypes,
        undefined,
        true
      );
      expect(saveAsMock).toHaveBeenCalledWith(blob, 'export.ndjson');
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });

    it('should export all, accounting for the current search criteria', async () => {
      const component = shallowRender();

      component.instance().onQueryChange({
        query: Query.parse('test'),
      });

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set up mocks
      const blob = new Blob([JSON.stringify(allSavedObjects)], { type: 'application/ndjson' });
      fetchExportByTypeAndSearchMock.mockImplementation(() => blob);

      await component.instance().onExportAll();

      expect(fetchExportByTypeAndSearchMock).toHaveBeenCalledWith(
        http,
        allowedTypes,
        'test*',
        true
      );
      expect(saveAsMock).toHaveBeenCalledWith(blob, 'export.ndjson');
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Your file is downloading in the background',
      });
    });
  });

  describe('import', () => {
    it('should show the flyout', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().showImportFlyout();
      component.update();

      expect(component.find(Flyout).length).toBe(1);
    });

    it('should hide the flyout', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().hideImportFlyout();
      component.update();

      expect(component.find(Flyout).length).toBe(0);
    });
  });

  describe('relationships', () => {
    it('should fetch relationships', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      await component.instance().getRelationships('search', '1');
      const savedObjectTypes = ['index-pattern', 'visualization', 'dashboard', 'search'];
      expect(getRelationshipsMock).toHaveBeenCalledWith(http, 'search', '1', savedObjectTypes);
    });

    it('should show the flyout', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.instance().onShowRelationships({
        id: '2',
        type: 'search',
        meta: {
          title: `MySearch`,
          icon: 'search',
          editUrl: '/management/kibana/objects/savedSearches/2',
          inAppUrl: {
            path: '/discover/2',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      } as SavedObjectWithMetadata);
      component.update();

      expect(component.find(Relationships).length).toBe(1);
      expect(component.state('relationshipObject')).toEqual({
        id: '2',
        type: 'search',
        meta: {
          title: 'MySearch',
          editUrl: '/management/kibana/objects/savedSearches/2',
          icon: 'search',
          inAppUrl: {
            path: '/discover/2',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      });
    });

    it('should hide the flyout', async () => {
      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
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
      const component = shallowRender();

      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ] as SavedObjectWithMetadata[];

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
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
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
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

      const component = shallowRender({ savedObjectsClient: mockSavedObjectsClient });

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
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
