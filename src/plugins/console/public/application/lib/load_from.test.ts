/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import { setLoadFromParameter, removeLoadFromParameter } from './load_from';

const baseMockWindow = () => {
  return {
    history: {
      pushState: jest.fn(),
    },
    location: {
      host: 'my-kibana.elastic.co',
      pathname: '',
      protocol: 'https:',
      search: '',
      hash: '',
    },
  };
};
let windowSpy: jest.SpyInstance;
let mockWindow = baseMockWindow();

describe('load from lib', () => {
  beforeEach(() => {
    mockWindow = baseMockWindow();
    windowSpy = jest.spyOn(globalThis, 'window', 'get');
    windowSpy.mockImplementation(() => mockWindow);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  describe('setLoadFromParameter', () => {
    it('adds load_from as expected', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: '#/console',
      };
      const codeSnippet = 'GET /_stats';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/dev_tools#/console?load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgzgFwIYLkA';

      setLoadFromParameter(codeSnippet);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('can replace an existing value', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: `#/console?load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgxgQwC5QJYDsAmq4FMDOQA`,
      };
      const codeSnippet = 'GET /_stats';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/dev_tools#/console?load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgzgFwIYLkA';

      setLoadFromParameter(codeSnippet);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('works with other query params', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: '#/console?foo=bar',
      };
      const codeSnippet = 'GET /_stats';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/dev_tools#/console?foo=bar&load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgzgFwIYLkA';

      setLoadFromParameter(codeSnippet);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('works with a non-hash route', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/enterprise_search/overview',
      };
      const codeSnippet = 'GET /_stats';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/enterprise_search/overview?load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgzgFwIYLkA';

      setLoadFromParameter(codeSnippet);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('works with a non-hash route and other params', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/enterprise_search/overview',
        search: '?foo=bar',
      };
      const codeSnippet = 'GET /_stats';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/enterprise_search/overview?foo=bar&load_from=data%3Atext%2Fplain%2COIUQKgBA9A%2BgzgFwIYLkA';

      setLoadFromParameter(codeSnippet);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
  });

  describe('removeLoadFromParameter', () => {
    it('leaves other params in place', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        search: `?foo=bar&load_from=data:text/plain,${compressToEncodedURIComponent(
          'GET /_cat/indices'
        )}`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/dev_tools?foo=bar';

      removeLoadFromParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('leaves other params with a hashroute', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: `#/console?foo=bar&load_from=data:text/plain,${compressToEncodedURIComponent(
          'GET /_cat/indices'
        )}`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/dev_tools#/console?foo=bar';

      removeLoadFromParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('removes ? if load_from was the only param', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        search: `?load_from=data:text/plain,${compressToEncodedURIComponent('GET /_cat/indices')}`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/dev_tools';

      removeLoadFromParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('removes ? if load_from was the only param in a hashroute', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: `#/console?load_from=data:text/plain,${compressToEncodedURIComponent(
          'GET /_cat/indices'
        )}`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/dev_tools#/console';

      removeLoadFromParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('noop if load_from not currently defined on QS', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/dev_tools',
        hash: `#/console?foo=bar`,
      };

      removeLoadFromParameter();
      expect(mockWindow.history.pushState).not.toHaveBeenCalled();
    });
  });
});
