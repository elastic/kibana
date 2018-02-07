import React from 'react';
import { shallow } from 'enzyme';
import { RecentlyAccessed, NUM_LONG_LINKS } from './recently_accessed';

const createRecentlyAccessed = (length) => {
  const recentlyAccessed = [];
  while(recentlyAccessed.length < length) {
    recentlyAccessed.push({
      label: `label${recentlyAccessed.length}`,
      link: `link${recentlyAccessed.length}`
    });
  }
  return recentlyAccessed;
};

test('should render dropdown when recently accessed list size exceeds NUM_LONG_LINKS', () => {
  const component = shallow(<RecentlyAccessed
    recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS + 1)}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should not render dropdown when recently accessed list size is less than NUM_LONG_LINKS', () => {
  const component = shallow(<RecentlyAccessed
    recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS - 1)}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should not render dropdown when recently accessed list size is NUM_LONG_LINKS', () => {
  const component = shallow(<RecentlyAccessed
    recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS)}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
