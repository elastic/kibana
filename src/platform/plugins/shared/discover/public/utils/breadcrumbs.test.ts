/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { setBreadcrumbs } from './breadcrumbs';

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
      {
        text: 'Discover',
        href: '#/custom-path',
        deepLinkId: 'discover',
      },
      { text: 'Saved Search' },
    ]);
  });

  describe('Embeddable Editor mode', () => {
    beforeEach(() => {
      jest.spyOn(discoverServiceMock.embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
    });

    describe('By Value', () => {
      beforeEach(() => {
        jest.spyOn(discoverServiceMock.embeddableEditor, 'isByValueEditor').mockReturnValue(true);
        jest
          .spyOn(discoverServiceMock.embeddableEditor, 'getByValueInput')
          .mockReturnValue({ label: 'Mock Label' } as DiscoverSessionTab);
      });

      it('should set the breadcrumbs to reflect Dashboards connection', () => {
        setBreadcrumbs({
          services: discoverServiceMock,
          titleBreadcrumbText: 'Saved Search',
          rootBreadcrumbPath: '#/custom-path',
        });

        expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
          {
            text: 'Dashboards',
            href: undefined,
            deepLinkId: 'dashboards',
            onClick: expect.any(Function),
          },
          { text: 'Editing Mock Label' },
        ]);
      });
    });

    describe('By Reference', () => {
      beforeEach(() => {
        jest.spyOn(discoverServiceMock.embeddableEditor, 'isByValueEditor').mockReturnValue(false);
        jest
          .spyOn(discoverServiceMock.embeddableEditor, 'getByValueInput')
          .mockReturnValue(undefined);
      });

      it('should set the breadcrumbs to reflect Dashboards connection', () => {
        setBreadcrumbs({
          services: discoverServiceMock,
          titleBreadcrumbText: 'Saved Search',
          rootBreadcrumbPath: '#/custom-path',
        });

        expect(discoverServiceMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
          {
            text: 'Dashboards',
            href: undefined,
            deepLinkId: 'dashboards',
            onClick: expect.any(Function),
          },
          { text: 'Editing Saved Search' },
        ]);
      });
    });
  });
});
