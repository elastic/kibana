import React from 'react';
import { shallow } from 'enzyme';
import chrome from 'ui/chrome';

import { LoadingIndicator } from './loading_indicator';

const rendered = new Set();
function render() {
  const wrapper = shallow(<LoadingIndicator />);
  rendered.add(wrapper);
  return wrapper;
}

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

afterEach(() => {
  for (const wrapper of rendered) {
    wrapper.unmount();
    rendered.delete(wrapper);
  }
});

describe('kbnLoadingIndicator', function () {
  it('is hidden by default', function () {
    const wrapper = render();

    expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator-hidden');
    expect(wrapper).toMatchSnapshot();
  });

  it('is visible when loadingCount is > 0', () => {
    chrome.loadingCount.subscribe.mockImplementation((fn) => {
      fn(1);
      return () => {};
    });

    const wrapper = render();

    expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator');
    expect(wrapper).toMatchSnapshot();
  });
});
