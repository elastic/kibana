import React from 'react';
import { shallow, mount } from 'enzyme';
import { RecentlyAccessed, NUM_LONG_LINKS } from './recently_accessed';
import { findTestSubject } from '@elastic/eui/lib/test';

const createRecentlyAccessed = (length) => {
  const recentlyAccessed = [];
  let i = 0;
  while(recentlyAccessed.length < length) {
    recentlyAccessed.push({
      label: `label${recentlyAccessed.length}`,
      link: `link${recentlyAccessed.length}`,
      id: `${i++}`
    });
  }
  return recentlyAccessed;
};

test('render', () => {
  const component = shallow(<RecentlyAccessed
    recentlyAccessed={createRecentlyAccessed(2)}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('more popover', () => {
  test('should not be rendered when recently accessed list size is less than NUM_LONG_LINKS', () => {
    const component = mount(<RecentlyAccessed
      recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS - 1)}
    />);

    const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
    expect(0).toBe(moreRecentlyAccessed.length);
  });

  test('should not be rendered when recently accessed list size is NUM_LONG_LINKS', () => {
    const component = mount(<RecentlyAccessed
      recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS)}
    />);

    const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
    expect(0).toBe(moreRecentlyAccessed.length);
  });

  describe('recently accessed list size exceeds NUM_LONG_LINKS', () => {
    test('should be rendered', () => {
      const component = mount(<RecentlyAccessed
        recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS + 1)}
      />);

      const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
      expect(1).toBe(moreRecentlyAccessed.length);
    });

    test('should only contain overflow recently accessed items when opened', () => {
      const numberOfRecentlyAccessed = NUM_LONG_LINKS + 2;
      const component = mount(<RecentlyAccessed
        recentlyAccessed={createRecentlyAccessed(numberOfRecentlyAccessed)}
      />);

      const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
      moreRecentlyAccessed.simulate('click');

      let i = 0;
      while (i < numberOfRecentlyAccessed) {
        const item = findTestSubject(component, `moreRecentlyAccessedItem${i}`);
        if (i < NUM_LONG_LINKS) {
          expect(0).toBe(item.length);
        } else {
          expect(1).toBe(item.length);
        }
        i++;
      }
    });
  });
});

