jest.mock('ui/notify',
  () => ({
    toastNotifications: {
      addWarning: () => {},
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

test('renders DashboardListing', () => {
  const component = shallow(<DashboardListing
    find={find}
    delete={() => {}}
    listingLimit={1000}
  />);
  expect(component).toMatchSnapshot();
});
