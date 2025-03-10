/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  bulkDeleteObjectsMock,
  bulkGetObjectsMock,
  extractExportDetailsMock,
  fetchExportByTypeAndSearchMock,
  fetchExportObjectsMock,
  findObjectsMock,
  getRelationshipsMock,
  getSavedObjectCountsMock,
  saveAsMock,
} from './saved_objects_table.test.mocks';

import React from 'react';
import { pick } from 'lodash';
import { Query } from '@elastic/eui';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';
import {
  httpServiceMock,
  overlayServiceMock,
  notificationServiceMock,
  applicationServiceMock,
} from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { SavedObjectManagementTypeInfo } from '../../../common/types';
import { actionServiceMock } from '../../services/action_service.mock';
import { columnServiceMock } from '../../services/column_service.mock';
import {
  SavedObjectsTable,
  SavedObjectsTableProps,
  SavedObjectsTableState,
} from './saved_objects_table';
import { Flyout, Relationships } from './components';
import { SavedObjectWithMetadata } from '../../types';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';

const convertType = (type: string): SavedObjectManagementTypeInfo => ({
  name: type,
  displayName: type,
  hidden: false,
  namespaceType: 'single',
});

const allowedTypes = ['index-pattern', 'visualization', 'dashboard', 'search', 'tag'].map(
  convertType
);

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
  {
    id: '5',
    type: 'tag',
    attributes: {
      title: `HelloWorldTag`,
    },
  },
];

describe('SavedObjectsTable', () => {
  let defaultProps: SavedObjectsTableProps;
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;
  let search: ReturnType<typeof dataPluginMock.createStartContract>['search'];

  const shallowRender = (overrides: Partial<SavedObjectsTableProps> = {}) => {
    return shallowWithI18nProvider(
      <SavedObjectsTable {...defaultProps} {...overrides} />
    ) as unknown as ShallowWrapper<
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
    http.delete.mockResolvedValue({ id: 'test' });

    getSavedObjectCountsMock.mockReturnValue({
      'index-pattern': 0,
      visualization: 0,
      dashboard: 0,
      search: 0,
      tag: 0,
    });

    defaultProps = {
      allowedTypes,
      actionRegistry: actionServiceMock.createStart(),
      columnRegistry: columnServiceMock.createStart(),
      dataViews: dataViewPluginMocks.createStartContract(),
      http,
      overlays,
      notifications,
      applications,
      perPageConfig: 15,
      goInspectObject: () => {},
      canGoInApp: () => true,
      search,
      customBranding: customBrandingServiceMock.createStartContract(),
    };

    findObjectsMock.mockImplementation(() => ({
      total: 5,
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          meta: {
            title: `MyIndexPattern*`,
            icon: 'indexPatternApp',
            editUrl: '#/management/kibana/dataViews/dataView/1',
            inAppUrl: {
              path: '/management/kibana/dataViews/dataView/1',
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
            inAppUrl: {
              path: '/discover/2',
              uiCapabilitiesPath: 'discover_v2.show',
            },
          },
        },
        {
          id: '3',
          type: 'dashboard',
          meta: {
            title: `MyDashboard`,
            icon: 'dashboardApp',
            inAppUrl: {
              path: '/dashboard/3',
              uiCapabilitiesPath: 'dashboard_v2.show',
            },
          },
        },
        {
          id: '4',
          type: 'visualization',
          meta: {
            title: `MyViz`,
            icon: 'visualizeApp',
            inAppUrl: {
              path: '/edit/4',
              uiCapabilitiesPath: 'visualize_v2.show',
            },
          },
        },
        {
          id: '5',
          type: 'tag',
          meta: {
            title: `HelloWorldTag`,
            icon: 'tag',
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
      bulkGetObjectsMock.mockResolvedValue(mockSavedObjects);

      const component = shallowRender();

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

    it('should display a warning if the export contains missing references', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        _id: obj.id,
        _source: {},
      }));
      bulkGetObjectsMock.mockResolvedValue(mockSavedObjects);

      extractExportDetailsMock.mockImplementation(() => ({
        exportedCount: 2,
        missingRefCount: 1,
        missingReferences: [{ id: '7', type: 'visualisation' }],
        excludedObjectsCount: 0,
        excludedObjects: [],
      }));

      const component = shallowRender();

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

    it('should display a specific message if the export contains excluded objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern' },
        { id: '3', type: 'dashboard' },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        _id: obj.id,
        _source: {},
      }));
      bulkGetObjectsMock.mockResolvedValue(mockSavedObjects);

      extractExportDetailsMock.mockImplementation(() => ({
        exportedCount: 2,
        missingRefCount: 0,
        missingReferences: [],
        excludedObjectsCount: 1,
        excludedObjects: [{ id: '7', type: 'visualisation' }],
      }));

      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().onExport(true);

      expect(fetchExportObjectsMock).toHaveBeenCalledWith(http, mockSelectedSavedObjects, true);
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title:
          'Your file is downloading in the background. ' +
          'Some objects were excluded from the export. ' +
          'Please see the last line in the exported file for a list of excluded objects.',
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

      expect(component.find('ExportModal')).toMatchSnapshot();
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

      expect(fetchExportByTypeAndSearchMock).toHaveBeenCalledWith({
        http,
        types: allowedTypes.map((type) => type.name),
        includeReferencesDeep: true,
      });
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

      expect(fetchExportByTypeAndSearchMock).toHaveBeenCalledWith({
        http,
        types: allowedTypes.map((type) => type.name),
        search: 'test*',
        includeReferencesDeep: true,
      });
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
      const savedObjectTypes = ['index-pattern', 'visualization', 'dashboard', 'search', 'tag'];
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
            uiCapabilitiesPath: 'discover_v2.show',
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
            uiCapabilitiesPath: 'discover_v2.show',
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
        { id: '1', type: 'index-pattern', meta: {} },
        { id: '3', type: 'dashboard', meta: {} },
      ] as SavedObjectWithMetadata[];

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);
      await component.instance().onDelete();
      component.update();

      expect(component.find('DeleteConfirmModal')).toMatchSnapshot();
    });

    it('should delete selected objects', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern', meta: {} },
        { id: '3', type: 'dashboard', meta: {} },
        { id: '4', type: 'dashboard', meta: { hiddenType: false } },
        { id: '5', type: 'dashboard', managed: true, meta: {} },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        source: {},
      }));
      bulkGetObjectsMock.mockResolvedValue(mockSavedObjects);
      bulkDeleteObjectsMock.mockResolvedValueOnce([
        { id: '1', type: 'index-pattern', success: true },
        { id: '3', type: 'dashboard', success: true },
      ]);

      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().delete();

      expect(defaultProps.dataViews.clearCache).toHaveBeenCalled();
      expect(bulkDeleteObjectsMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining(pick(mockSavedObjects[0], 'id', 'type')),
          expect.objectContaining(pick(mockSavedObjects[1], 'id', 'type')),
        ])
      );
      expect(component.state('selectedSavedObjects').length).toBe(0);
    });

    it('should show a notification when deletion failed', async () => {
      const mockSelectedSavedObjects = [
        { id: '1', type: 'index-pattern', meta: {} },
        { id: '3', type: 'hidden-type', meta: {} },
      ] as SavedObjectWithMetadata[];

      const mockSavedObjects = mockSelectedSavedObjects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        source: {},
      }));
      bulkGetObjectsMock.mockResolvedValue(mockSavedObjects);
      bulkDeleteObjectsMock.mockResolvedValueOnce([
        { id: '1', type: 'index-pattern', success: true },
        {
          id: '3',
          type: 'hidden-type',
          success: false,
          error: { message: 'Something went wrong.' },
        },
      ]);

      const component = shallowRender();

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      // Set some as selected
      component.instance().onSelectionChanged(mockSelectedSavedObjects);

      await component.instance().delete();

      expect(defaultProps.dataViews.clearCache).toHaveBeenCalled();
      expect(notifications.toasts.addInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('1 object.'),
        })
      );
    });
  });
});
