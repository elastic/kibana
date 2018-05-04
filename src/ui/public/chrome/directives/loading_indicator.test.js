import React from 'react';
import { shallow } from 'enzyme';
import chrome from 'ui/chrome';

import { LoadingIndicator } from './loading_indicator';

jest.mock('ui/chrome', () => {
  return {
    loadingCount: {
      subscribe: jest.fn(() => {
        return () => {};
      })
    }
  };
});

beforeEach(() => {
  chrome.loadingCount.subscribe.mockClear();
});

describe('kbnLoadingIndicator', function () {
  it('is hidden by default', function () {
    const wrapper = shallow(<LoadingIndicator />);
    expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator-hidden');
    expect(wrapper).toMatchSnapshot();
  });

  it('is visible when loadingCount is > 0', () => {
    chrome.loadingCount.subscribe.mockImplementation((fn) => {
      fn(1);
      return () => {};
    });

    const wrapper = shallow(<LoadingIndicator />);
    expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator');
    expect(wrapper).toMatchSnapshot();
  });
});
