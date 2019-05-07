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

jest.mock('ui/chrome', () => ({
  addBasePath: () => ''
}));

jest.mock('../../../../../lib/fetch_export_by_type', () => ({
  fetchExportByType: jest.fn(),
}));

jest.mock('../../../../../lib/fetch_export_objects', () => ({
  fetchExportObjects: jest.fn(),
}));

import { Relationships } from '../relationships';

describe('Relationships', () => {

  it('should render index patterns normally', async () => {
    const props = {
      goInspectObject: () => {},
      getRelationships: jest.fn().mockImplementation(() => ([
        {
          type: 'search',
          id: '1',
          relationship: 'parent',
          meta: {
            editUrl: '/management/kibana/objects/savedSearches/1',
            icon: 'search',
            inAppUrl: {
              path: '/app/kibana#/discover/1',
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
            editUrl: '/management/kibana/objects/savedVisualizations/2',
            icon: 'visualizeApp',
            inAppUrl: {
              path: '/app/kibana#/visualize/edit/2',
              uiCapabilitiesPath: 'visualize.show',
            },
            title: 'My Visualization Title',
          },
        },
      ])),
      savedObject: {
        id: '1',
        type: 'index-pattern',
        meta: {
          title: 'MyIndexPattern*',
          icon: 'indexPatternApp',
          editUrl: '#/management/kibana/index_patterns/1',
          inAppUrl: {
            path: '/management/kibana/index_patterns/1',
            uiCapabilitiesPath: 'management.kibana.index_patterns',
          },
        },
      },
      close: jest.fn(),
    };

    const component = shallowWithIntl(
      <Relationships.WrappedComponent
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render searches normally', async () => {
    const props = {
      goInspectObject: () => {},
      getRelationships: jest.fn().mockImplementation(() => ([
        {
          type: 'index-pattern',
          id: '1',
          relationship: 'child',
          meta: {
            editUrl: '/management/kibana/index_patterns/1',
            icon: 'indexPatternApp',
            inAppUrl: {
              path: '/app/kibana#/management/kibana/index_patterns/1',
              uiCapabilitiesPath: 'management.kibana.index_patterns',
            },
            title: 'My Index Pattern',
          },
        },
        {
          type: 'visualization',
          id: '2',
          relationship: 'parent',
          meta: {
            editUrl: '/management/kibana/objects/savedVisualizations/2',
            icon: 'visualizeApp',
            inAppUrl: {
              path: '/app/kibana#/visualize/edit/2',
              uiCapabilitiesPath: 'visualize.show',
            },
            title: 'My Visualization Title',
          },
        },
      ])),
      savedObject: {
        id: '1',
        type: 'search',
        meta: {
          title: 'MySearch',
          icon: 'search',
          editUrl: '#/management/kibana/objects/savedSearches/1',
          inAppUrl: {
            path: '/discover/1',
            uiCapabilitiesPath: 'discover.show',
          },
        },
      },
      close: jest.fn(),
    };

    const component = shallowWithIntl(
      <Relationships.WrappedComponent
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render visualizations normally', async () => {
    const props = {
      goInspectObject: () => {},
      getRelationships: jest.fn().mockImplementation(() => ([
        {
          type: 'dashboard',
          id: '1',
          relationship: 'parent',
          meta: {
            editUrl: '/management/kibana/objects/savedDashboards/1',
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
            editUrl: '/management/kibana/objects/savedDashboards/2',
            icon: 'dashboardApp',
            inAppUrl: {
              path: '/app/kibana#/dashboard/2',
              uiCapabilitiesPath: 'dashboard.show',
            },
            title: 'My Dashboard 2',
          },
        },
      ])),
      savedObject: {
        id: '1',
        type: 'visualization',
        meta: {
          title: 'MyViz',
          icon: 'visualizeApp',
          editUrl: '#/management/kibana/objects/savedVisualizations/1',
          inAppUrl: {
            path: '/visualize/edit/1',
            uiCapabilitiesPath: 'visualize.show',
          },
        },
      },
      close: jest.fn(),
    };

    const component = shallowWithIntl(
      <Relationships.WrappedComponent
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render dashboards normally', async () => {
    const props = {
      goInspectObject: () => {},
      getRelationships: jest.fn().mockImplementation(() => ([
        {
          type: 'visualization',
          id: '1',
          relationship: 'child',
          meta: {
            editUrl: '/management/kibana/objects/savedVisualizations/1',
            icon: 'visualizeApp',
            inAppUrl: {
              path: '/app/kibana#/visualize/edit/1',
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
            editUrl: '/management/kibana/objects/savedVisualizations/2',
            icon: 'visualizeApp',
            inAppUrl: {
              path: '/app/kibana#/visualize/edit/2',
              uiCapabilitiesPath: 'visualize.show',
            },
            title: 'My Visualization Title 2',
          },
        },
      ])),
      savedObject: {
        id: '1',
        type: 'dashboard',
        meta: {
          title: 'MyDashboard',
          icon: 'dashboardApp',
          editUrl: '#/management/kibana/objects/savedDashboards/1',
          inAppUrl: {
            path: '/dashboard/1',
            uiCapabilitiesPath: 'dashboard.show',
          },
        },
      },
      close: jest.fn(),
    };

    const component = shallowWithIntl(
      <Relationships.WrappedComponent
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render errors', async () => {
    const props = {
      goInspectObject: () => {},
      getRelationships: jest.fn().mockImplementation(() => {
        throw new Error('foo');
      }),
      savedObject: {
        id: '1',
        type: 'dashboard',
        meta: {
          title: 'MyDashboard',
          icon: 'dashboardApp',
          editUrl: '#/management/kibana/objects/savedDashboards/1',
          inAppUrl: {
            path: '/dashboard/1',
            uiCapabilitiesPath: 'dashboard.show',
          },
        },
      },
      close: jest.fn(),
    };

    const component = shallowWithIntl(
      <Relationships.WrappedComponent
        {...props}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });
});
