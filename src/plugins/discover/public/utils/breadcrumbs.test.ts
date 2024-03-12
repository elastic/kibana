/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
      { text: 'Discover', href: '#/', deepLinkId: 'discover' },
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
      { text: 'Discover', href: '#/custom-path', deepLinkId: 'discover' },
      { text: 'Saved Search' },
    ]);
  });

  test('should set breadcrumbs with profile root path', () => {
    const history = createMemoryHistory<HistoryLocationState>({});
    history.push('/p/my-profile');
    setBreadcrumbs({
      services: {
        ...discoverServiceMock,
        history,
      },
      titleBreadcrumbText: 'Saved Search',
    });
    expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Discover', href: '#/p/my-profile/', deepLinkId: 'discover' },
      { text: 'Saved Search' },
    ]);
  });
});
