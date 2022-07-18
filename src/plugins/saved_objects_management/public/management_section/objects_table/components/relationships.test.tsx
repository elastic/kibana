/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import { Relationships, RelationshipsProps } from './relationships';

jest.mock('../../../lib/fetch_export_by_type_and_search', () => ({
  fetchExportByTypeAndSearch: jest.fn(),
}));

jest.mock('../../../lib/fetch_export_objects', () => ({
  fetchExportObjects: jest.fn(),
}));

const allowedTypes: SavedObjectManagementTypeInfo[] = [
  {
    name: 'index-pattern',
    displayName: 'index-pattern',
    namespaceType: 'single',
    hidden: false,
  },
];

describe('Relationships', () => {
  it('should render index patterns normally', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => ({
        relations: [
          {
            type: 'search',
            id: '1',
            relationship: 'parent',
            meta: {
              icon: 'search',
              inAppUrl: {
                path: '/app/discover#//1',
                uiCapabilitiesPath: 'discover.show',
              },
              title: 'My Search Title',
            },
          },
          {
            type: 'visualization',
            id: '2',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              inAppUrl: {
                path: '/app/visualize#/edit/2',
                uiCapabilitiesPath: 'visualize.show',
              },
              title: 'My Visualization Title',
            },
          },
        ],
        invalidRelations: [],
      })),
      savedObject: {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
        meta: {
          title: 'MyIndexPattern*',
          icon: 'indexPatternApp',
          editUrl: '#/management/kibana/dataViews/dataView/1',
          inAppUrl: {
            path: '/management/kibana/dataViews/dataView/1',
            uiCapabilitiesPath: 'management.kibana.indexPatterns',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Make sure we are showing loading
    expect(component.find('EuiLoadingElastic').length).toBe(1);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render searches normally', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => ({
        relations: [
          {
            type: 'index-pattern',
            id: '1',
            relationship: 'child',
            meta: {
              editUrl: '/management/kibana/dataViews/dataView/1',
              icon: 'indexPatternApp',
              inAppUrl: {
                path: '/app/management/kibana/dataViews/dataView/1',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              title: 'My Index Pattern',
            },
          },
          {
            type: 'visualization',
            id: '2',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              inAppUrl: {
                path: '/app/visualize#/edit/2',
                uiCapabilitiesPath: 'visualize.show',
              },
              title: 'My Visualization Title',
            },
          },
        ],
        invalidRelations: [],
      })),
      savedObject: {
        id: '1',
        type: 'search',
        attributes: {},
        references: [],
        meta: {
          title: 'MySearch',
          icon: 'search',
          inAppUrl: {
            path: '/discover/1',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Make sure we are showing loading
    expect(component.find('EuiLoadingElastic').length).toBe(1);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render visualizations normally', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => ({
        relations: [
          {
            type: 'dashboard',
            id: '1',
            relationship: 'parent',
            meta: {
              icon: 'dashboardApp',
              inAppUrl: {
                path: '/app/kibana#/dashboard/1',
                uiCapabilitiesPath: 'dashboard.show',
              },
              title: 'My Dashboard 1',
            },
          },
          {
            type: 'dashboard',
            id: '2',
            relationship: 'parent',
            meta: {
              icon: 'dashboardApp',
              inAppUrl: {
                path: '/app/kibana#/dashboard/2',
                uiCapabilitiesPath: 'dashboard.show',
              },
              title: 'My Dashboard 2',
            },
          },
        ],
        invalidRelations: [],
      })),
      savedObject: {
        id: '1',
        type: 'visualization',
        attributes: {},
        references: [],
        meta: {
          title: 'MyViz',
          icon: 'visualizeApp',
          inAppUrl: {
            path: '/edit/1',
            uiCapabilitiesPath: 'visualize.show',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Make sure we are showing loading
    expect(component.find('EuiLoadingElastic').length).toBe(1);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render dashboards normally', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => ({
        relations: [
          {
            type: 'visualization',
            id: '1',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              inAppUrl: {
                path: '/app/visualize#/edit/1',
                uiCapabilitiesPath: 'visualize.show',
              },
              title: 'My Visualization Title 1',
            },
          },
          {
            type: 'visualization',
            id: '2',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              inAppUrl: {
                path: '/app/visualize#/edit/2',
                uiCapabilitiesPath: 'visualize.show',
              },
              title: 'My Visualization Title 2',
            },
          },
        ],
        invalidRelations: [],
      })),
      savedObject: {
        id: '1',
        type: 'dashboard',
        attributes: {},
        references: [],
        meta: {
          title: 'MyDashboard',
          icon: 'dashboardApp',
          inAppUrl: {
            path: '/dashboard/1',
            uiCapabilitiesPath: 'dashboard.show',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Make sure we are showing loading
    expect(component.find('EuiLoadingElastic').length).toBe(1);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render errors', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => {
        throw new Error('foo');
      }),
      savedObject: {
        id: '1',
        type: 'dashboard',
        attributes: {},
        references: [],
        meta: {
          title: 'MyDashboard',
          icon: 'dashboardApp',
          inAppUrl: {
            path: '/dashboard/1',
            uiCapabilitiesPath: 'dashboard.show',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render invalid relations', async () => {
    const props: RelationshipsProps = {
      goInspectObject: () => {},
      canGoInApp: () => true,
      basePath: httpServiceMock.createSetupContract().basePath,
      getRelationships: jest.fn().mockImplementation(() => ({
        relations: [],
        invalidRelations: [
          {
            id: '1',
            type: 'dashboard',
            relationship: 'child',
            error: 'Saved object [dashboard/1] not found',
          },
        ],
      })),
      savedObject: {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
        meta: {
          title: 'MyIndexPattern*',
          icon: 'indexPatternApp',
          editUrl: '#/management/kibana/dataViews/dataView/1',
          inAppUrl: {
            path: '/management/kibana/dataViews/dataView/1',
            uiCapabilitiesPath: 'management.kibana.indexPatterns',
          },
        },
      },
      allowedTypes,
      close: jest.fn(),
    };

    const component = shallowWithI18nProvider(<Relationships {...props} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });
});
