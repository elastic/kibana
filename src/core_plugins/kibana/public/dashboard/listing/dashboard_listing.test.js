jest.mock('ui/notify',
  () => ({
    toastNotifications: {
      addWarning: () => {},
    }
  }), { virtual: true });

jest.mock('lodash',
  () => ({
    // mock debounce to fire immediately with no internal timer
    debounce: function (func) {
      function debounced(...args) {
        return func.apply(this, args);
      }
      return debounced;
    }
  }), { virtual: true });

import React from 'react';
import { shallow } from 'enzyme';

import {
  DashboardListing,
} from './dashboard_listing';

const find = (num) => {
  const hits = [];
  for (let i = 0; i < num; i++) {
    hits.push({
      id: `dashboard${i}`,
      title: `dashboard${i} title`,
      description: `dashboard${i} desc`
    });
  }
  return Promise.resolve({
    total: num,
    hits: hits
  });
};

test('renders table in loading state', () => {
  const component = shallow(<DashboardListing
    find={find.bind(null, 2)}
    delete={() => {}}
    listingLimit={1000}
    hideWriteControls={false}
  />);
  expect(component).toMatchSnapshot();
});

describe('after fetch', () => {
  test('renders table rows', async () => {
    const component = shallow(<DashboardListing
      find={find.bind(null, 2)}
      delete={() => {}}
      listingLimit={1000}
      hideWriteControls={false}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders call to action when no dashboards exist', async () => {
    const component = shallow(<DashboardListing
      find={find.bind(null, 0)}
      delete={() => {}}
      listingLimit={1}
      hideWriteControls={false}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('hideWriteControls', async () => {
    const component = shallow(<DashboardListing
      find={find.bind(null, 0)}
      delete={() => {}}
      listingLimit={1}
      hideWriteControls={true}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders warning when listingLimit is exceeded', async () => {
    const component = shallow(<DashboardListing
      find={find.bind(null, 2)}
      delete={() => {}}
      listingLimit={1}
      hideWriteControls={false}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
