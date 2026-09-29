/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { setBreadcrumbs } from './breadcrumbs';

describe('Breadcrumbs', () => {
  const discoverServiceMock = createDiscoverServicesMock();
  beforeEach(() => {
    (discoverServiceMock.chrome.setBreadcrumbs as Mock).mockClear();
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
      vi.spyOn(discoverServiceMock.embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
    });

    describe('By Value', () => {
      beforeEach(() => {
        vi.spyOn(discoverServiceMock.embeddableEditor, 'isByValueEditor').mockReturnValue(true);
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getByValueTab')
          .mockReturnValue({ label: 'Mock Label' } as DiscoverSessionTab);
      });

      afterEach(() => {
        vi.clearAllMocks();
      });

      it('should set the breadcrumbs to reflect Dashboards connection when editting', () => {
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getEmbeddableId')
          .mockReturnValue('mock-embeddable-id');

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

      it('should set the breadcrumbs to reflect Discover when creating a new session', () => {
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getEmbeddableId')
          .mockReturnValue(undefined);
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getByValueTab')
          .mockReturnValue({ label: 'New Discover session' } as DiscoverSessionTab);

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
          { text: 'New Discover session' },
        ]);
      });
    });

    describe('By Reference', () => {
      beforeEach(() => {
        vi.spyOn(discoverServiceMock.embeddableEditor, 'isByValueEditor').mockReturnValue(false);
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getByValueTab')
          .mockReturnValue(undefined);
        vi
          .spyOn(discoverServiceMock.embeddableEditor, 'getEmbeddableId')
          .mockReturnValue('mock-embeddable-id');
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
