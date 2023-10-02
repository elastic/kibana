/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { serverlessMock } from '@kbn/serverless/public/mocks';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { setBreadcrumbs } from './breadcrumbs';
import { createMemoryHistory } from 'history';
import type { HistoryLocationState } from '../build_services';

describe('Breadcrumbs', () => {
  const discoverServiceMock = createDiscoverServicesMock();
  beforeEach(() => {
    (discoverServiceMock.chrome.setBreadcrumbs as jest.Mock).mockClear();
  });

  test('should set breadcrumbs with default root', () => {
    setBreadcrumbs({ services: discoverServiceMock });
    expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Discover' }]);
  });

  test('should set breadcrumbs with title', () => {
    setBreadcrumbs({ services: discoverServiceMock, titleBreadcrumbText: 'Saved Search' });
    expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Discover', href: '#/' },
      { text: 'Saved Search' },
    ]);
  });

  test('should set breadcrumbs with custom root path', () => {
    setBreadcrumbs({
      services: discoverServiceMock,
      titleBreadcrumbText: 'Saved Search',
      rootBreadcrumbPath: '#/custom-path',
    });
    expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Discover', href: '#/custom-path' },
      { text: 'Saved Search' },
    ]);
  });

  test('should set breadcrumbs with profile root path', () => {
    setBreadcrumbs({
      services: {
        ...discoverServiceMock,
        history: () => {
          const history = createMemoryHistory<HistoryLocationState>({});
          history.push('/p/my-profile');
          return history;
        },
      },
      titleBreadcrumbText: 'Saved Search',
    });
    expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Discover', href: '#/p/my-profile/' },
      { text: 'Saved Search' },
    ]);
  });
});

describe('Serverless Breadcrumbs', () => {
  const discoverServiceMock = {
    ...createDiscoverServicesMock(),
    serverless: serverlessMock.createStart(),
  };
  beforeEach(() => {
    (discoverServiceMock.serverless.setBreadcrumbs as jest.Mock).mockClear();
  });

  test('should not set any root', () => {
    setBreadcrumbs({ services: discoverServiceMock });
    expect(discoverServiceMock.serverless.setBreadcrumbs).toHaveBeenCalledWith([]);
  });

  test('should set title breadcrumb', () => {
    setBreadcrumbs({ services: discoverServiceMock, titleBreadcrumbText: 'Saved Search' });
    expect(discoverServiceMock.serverless.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Saved Search' },
    ]);
  });

  test("shouldn't set root breadcrumbs, even when there is a custom root path", () => {
    setBreadcrumbs({
      services: discoverServiceMock,
      titleBreadcrumbText: 'Saved Search',
      rootBreadcrumbPath: '#/custom-path',
    });
    expect(discoverServiceMock.serverless.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Saved Search' },
    ]);
  });

  test("shouldn't set root breadcrumbs, even when there is a custom profile", () => {
    setBreadcrumbs({
      services: {
        ...discoverServiceMock,
        history: () => {
          const history = createMemoryHistory<HistoryLocationState>({});
          history.push('/p/my-profile');
          return history;
        },
      },
      titleBreadcrumbText: 'Saved Search',
    });
    expect(discoverServiceMock.serverless.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Saved Search' },
    ]);
  });
});
