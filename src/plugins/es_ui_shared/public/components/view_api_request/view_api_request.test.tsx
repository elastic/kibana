/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

import { ViewApiRequest } from './view_api_request';
import type { UrlService } from 'src/plugins/share/common/url_service';

const payload = {
  title: 'Test title',
  description: 'Test description',
  request: 'Hello world',
  closeFlyout: jest.fn(),
};

const urlService = {
  locators: {
    get: jest.fn().mockReturnValue({
      useUrl: jest.fn().mockImplementation((value) => {
        return `devToolsUrl_${value?.loadFrom}`;
      }),
    }),
  },
} as any as UrlService;

describe('ViewApiRequest', () => {
  test('is rendered', () => {
    const component = mountWithI18nProvider(<ViewApiRequest {...payload} />);
    expect(takeMountedSnapshot(component)).toMatchSnapshot();
  });

  describe('props', () => {
    test('on closeFlyout', async () => {
      const component = mountWithI18nProvider(<ViewApiRequest {...payload} />);

      await act(async () => {
        findTestSubject(component, 'apiRequestFlyoutClose').simulate('click');
      });

      expect(payload.closeFlyout).toBeCalled();
    });

    test('doesnt have openInConsole when some optional props are not supplied', async () => {
      const component = mountWithI18nProvider(<ViewApiRequest {...payload} canShowDevtools />);

      const openInConsole = findTestSubject(component, 'apiRequestFlyoutOpenInConsoleButton');
      expect(openInConsole.length).toEqual(0);
    });

    test('has openInConsole when all optional props are supplied', async () => {
      const component = mountWithI18nProvider(
        <ViewApiRequest
          {...payload}
          canShowDevtools
          navigateToUrl={jest.fn()}
          urlService={urlService}
        />
      );

      const openInConsole = findTestSubject(component, 'apiRequestFlyoutOpenInConsoleButton');
      expect(openInConsole.length).toEqual(1);
      expect(openInConsole.props().href).toContain('devToolsUrl_data:text/plain');
    });
  });
});
