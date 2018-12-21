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

import { Relationships } from '../relationships';

describe('Relationships', () => {
  it('should render index patterns normally', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => ({
        searches: [
          {
            id: '1',
          }
        ],
        visualizations: [
          {
            id: '2',
          }
        ],
      })),
      getEditUrl: () => '',
      goInApp: jest.fn(),
      id: '1',
      type: 'index-pattern',
      title: 'MyIndexPattern*',
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
      getRelationships: jest.fn().mockImplementation(() => ({
        indexPatterns: [
          {
            id: '1',
          }
        ],
        visualizations: [
          {
            id: '2',
          }
        ],
      })),
      getEditUrl: () => '',
      goInApp: jest.fn(),
      id: '1',
      type: 'search',
      title: 'MySearch',
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
      getRelationships: jest.fn().mockImplementation(() => ({
        dashboards: [
          {
            id: '1',
          },
          {
            id: '2',
          }
        ],
      })),
      getEditUrl: () => '',
      goInApp: jest.fn(),
      id: '1',
      type: 'visualization',
      title: 'MyViz',
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
      getRelationships: jest.fn().mockImplementation(() => ({
        visualizations: [
          {
            id: '1',
          },
          {
            id: '2',
          }
        ],
      })),
      getEditUrl: () => '',
      goInApp: jest.fn(),
      id: '1',
      type: 'dashboard',
      title: 'MyDashboard',
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
      getRelationships: jest.fn().mockImplementation(() => {
        throw new Error('foo');
      }),
      getEditUrl: () => '',
      goInApp: jest.fn(),
      id: '1',
      type: 'dashboard',
      title: 'MyDashboard',
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
