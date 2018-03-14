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

const find = () => {
  return Promise.resolve({
    total: 2,
    hits: [
      {
        id: 'dashboard1',
        title: 'dashboard1 title',
        description: 'dashboard1 desc'
      },
      {
        id: 'dashboard2',
        title: 'dashboard2 title',
        description: 'dashboard2 desc'
      },
    ]
  });
};

test('renders table in loading state', () => {
  const component = shallow(<DashboardListing
    find={find}
    delete={() => {}}
    listingLimit={1000}
  />);
  expect(component).toMatchSnapshot();
});

describe('after fetch', () => {
  test('renders table rows', async () => {
    const component = shallow(<DashboardListing
      find={find}
      delete={() => {}}
      listingLimit={1000}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('renders warning when listingLimit is exceeded', async () => {
    const component = shallow(<DashboardListing
      find={find}
      delete={() => {}}
      listingLimit={1}
    />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
