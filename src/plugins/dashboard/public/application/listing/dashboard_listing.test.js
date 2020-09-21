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

jest.mock(
  'lodash',
  () => ({
    ...require.requireActual('lodash'),
    // mock debounce to fire immediately with no internal timer
    debounce: (func) => {
      function debounced(...args) {
        return func.apply(this, args);
      }
      return debounced;
    },
  }),
  { virtual: true }
);

import React from 'react';
import { shallow } from 'enzyme';

import { DashboardListing } from './dashboard_listing';

const find = (num) => {
  const hits = [];
  for (let i = 0; i < num; i++) {
    hits.push({
      id: `dashboard${i}`,
      title: `dashboard${i} title`,
      description: `dashboard${i} desc`,
    });
  }
  return Promise.resolve({
    total: num,
    hits: hits,
  });
};

test('renders empty page in before initial fetch to avoid flickering', () => {
  const component = shallow(
    <DashboardListing
      findItems={find.bind(null, 2)}
      deleteItems={() => {}}
      createItem={() => {}}
      editItem={() => {}}
      getViewUrl={() => {}}
      listingLimit={1000}
      hideWriteControls={false}
      core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
    />
  );
  expect(component).toMatchSnapshot();
});

describe('after fetch', () => {
  test('initialFilter', async () => {
    const component = shallow(
      <DashboardListing
        findItems={find.bind(null, 2)}
        deleteItems={() => {}}
        createItem={() => {}}
        editItem={() => {}}
        getViewUrl={() => {}}
        listingLimit={1000}
        hideWriteControls={false}
        initialPageSize={10}
        initialFilter="my dashboard"
        core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders table rows', async () => {
    const component = shallow(
      <DashboardListing
        findItems={find.bind(null, 2)}
        deleteItems={() => {}}
        createItem={() => {}}
        editItem={() => {}}
        getViewUrl={() => {}}
        listingLimit={1000}
        initialPageSize={10}
        hideWriteControls={false}
        core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders call to action when no dashboards exist', async () => {
    const component = shallow(
      <DashboardListing
        findItems={find.bind(null, 0)}
        deleteItems={() => {}}
        createItem={() => {}}
        editItem={() => {}}
        getViewUrl={() => {}}
        listingLimit={1}
        initialPageSize={10}
        hideWriteControls={false}
        core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('hideWriteControls', async () => {
    const component = shallow(
      <DashboardListing
        findItems={find.bind(null, 0)}
        deleteItems={() => {}}
        createItem={() => {}}
        editItem={() => {}}
        getViewUrl={() => {}}
        listingLimit={1}
        initialPageSize={10}
        hideWriteControls={true}
        core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders warning when listingLimit is exceeded', async () => {
    const component = shallow(
      <DashboardListing
        findItems={find.bind(null, 2)}
        deleteItems={() => {}}
        createItem={() => {}}
        editItem={() => {}}
        getViewUrl={() => {}}
        listingLimit={1}
        initialPageSize={10}
        hideWriteControls={false}
        core={{ notifications: { toasts: {} }, uiSettings: { get: jest.fn(() => 10) } }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
