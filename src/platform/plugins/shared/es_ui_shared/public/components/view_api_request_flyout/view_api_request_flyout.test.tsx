/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { compressToEncodedURIComponent } from 'lz-string';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ViewApiRequestFlyout } from './view_api_request_flyout';
import type { UrlService } from '@kbn/share-plugin/common/url_service';
import type { ApplicationStart } from '@kbn/core/public';
import { applicationServiceMock } from '@kbn/core/public/mocks';

const payload = {
  title: 'Test title',
  description: 'Test description',
  request: 'Hello world',
  closeFlyout: jest.fn(),
};

const urlServiceMock = {
  locators: {
    get: jest.fn().mockReturnValue({
      useUrl: jest.fn().mockImplementation((value) => {
        return `devToolsUrl_${value?.loadFrom}`;
      }),
    }),
  },
} as any as UrlService;

const applicationMock = {
  ...applicationServiceMock.createStartContract(),
  capabilities: {
    dev_tools: {
      show: true,
    },
  },
} as any as ApplicationStart;

describe('ViewApiRequestFlyout', () => {
  test('is rendered', () => {
    const { container } = renderWithI18n(<ViewApiRequestFlyout {...payload} />);
    expect(container).toMatchSnapshot();
  });

  describe('props', () => {
    test('on closeFlyout', async () => {
      const user = userEvent.setup();
      renderWithI18n(<ViewApiRequestFlyout {...payload} />);

      const closeButton = screen.getByTestId('apiRequestFlyoutClose');
      await user.click(closeButton);

      expect(payload.closeFlyout).toHaveBeenCalled();
    });

    test('doesnt have openInConsole when some optional props are not supplied', async () => {
      renderWithI18n(<ViewApiRequestFlyout {...payload} />);

      const openInConsole = screen.queryByTestId('apiRequestFlyoutOpenInConsoleButton');
      expect(openInConsole).not.toBeInTheDocument();

      // Flyout should *not* be wrapped with RedirectAppLinks
      const redirectWrapper = screen.queryByTestId('apiRequestFlyoutRedirectWrapper');
      expect(redirectWrapper).not.toBeInTheDocument();
    });

    test('has openInConsole when all optional props are supplied', async () => {
      const encodedRequest = compressToEncodedURIComponent(payload.request);
      renderWithI18n(
        <ViewApiRequestFlyout
          {...payload}
          application={applicationMock}
          urlService={urlServiceMock}
        />
      );

      const openInConsole = screen.getByTestId('apiRequestFlyoutOpenInConsoleButton');
      expect(openInConsole).toBeInTheDocument();
      expect(openInConsole).toHaveAttribute(
        'href',
        `devToolsUrl_data:text/plain,${encodedRequest}`
      );

      // Flyout should be wrapped with RedirectAppLinks
      const redirectWrapper = screen.getByTestId('apiRequestFlyoutRedirectWrapper');
      expect(redirectWrapper).toBeInTheDocument();
    });
  });
});
