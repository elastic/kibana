/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';

import { urlServiceTestSetup } from '../../../../common/url_service/__tests__/setup';
import { MockLocatorDefinition } from '../../../../common/url_service/mocks';
import { BrowserShortUrlClientFactory } from '../../../url_service/short_urls/short_url_client_factory';
import {
  BrowserShortUrlClientHttp,
  BrowserShortUrlClient,
} from '../../../url_service/short_urls/short_url_client';
import { BrowserUrlService } from '../../../types';
import { LinkContent } from './link_content';

const renderComponent = (props: ComponentProps<typeof LinkContent>) => {
  render(
    <IntlProvider locale="en">
      <LinkContent {...props} />
    </IntlProvider>
  );
};

describe('LinkContent', () => {
  const shareableUrl = 'http://localhost:5601/app/dashboards#/view/123';

  const http: BrowserShortUrlClientHttp = {
    basePath: {
      get: () => '/xyz',
    },
    fetch: jest.fn(async () => {
      return {} as any;
    }),
  };

  let urlService: BrowserUrlService;

  // @ts-expect-error there is a type error because we override the shortUrls implementation
  // eslint-disable-next-line prefer-const
  ({ service: urlService } = urlServiceTestSetup({
    shortUrls: ({ locators }) =>
      new BrowserShortUrlClientFactory({
        http,
        locators,
      }),
  }));

  beforeAll(() => {
    Object.defineProperty(document, 'execCommand', {
      value: jest.fn(() => true),
    });
  });

  it('uses the delegatedShareUrlHandler to generate the shareable URL when it is provided', async () => {
    const user = userEvent.setup();
    const objectType = 'dashboard';
    const objectId = '123';
    const isDirty = false;

    const delegatedShareUrlHandler = jest.fn();

    renderComponent({
      objectType,
      objectId,
      isDirty,
      shareableUrl,
      urlService,
      allowShortUrl: true,
      delegatedShareUrlHandler,
    });

    await user.click(screen.getByTestId('copyShareUrlButton'));

    expect(delegatedShareUrlHandler).toHaveBeenCalled();
  });

  it('returns the shareable URL when the delegatedShareUrlHandler is not provided and shortURLs are not allowed', async () => {
    const user = userEvent.setup();
    const objectType = 'dashboard';
    const objectId = '123';
    const isDirty = false;

    renderComponent({
      objectType,
      objectId,
      isDirty,
      shareableUrl,
      urlService,
      allowShortUrl: false,
    });

    const copyButton = screen.getByTestId('copyShareUrlButton');

    await user.click(copyButton);

    await waitFor(() => {
      expect(copyButton.getAttribute('data-share-url')).toBe(shareableUrl);
    });
  });

  it('invokes the createWithLocator method on the shortURL service if a locator is present when the copy button is clicked', async () => {
    const user = userEvent.setup();
    const objectType = 'dashboard';
    const objectId = '123';
    const isDirty = false;
    const shareableUrlLocatorParams = {
      locator: new MockLocatorDefinition('TEST_LOCATOR'),
      params: {},
    };

    const shortURL = 'http://localhost:5601/xyz/r/s/yellow-orange-tomato';

    const createWithLocatorSpy = jest.spyOn(BrowserShortUrlClient.prototype, 'createWithLocator');

    createWithLocatorSpy.mockResolvedValue({
      // @ts-expect-error we only return locator property, as that's all we need for this test
      locator: {
        getUrl: jest.fn(() => Promise.resolve(shortURL)),
      },
    });

    renderComponent({
      objectType,
      objectId,
      isDirty,
      shareableUrl,
      urlService,
      allowShortUrl: true,
      // @ts-ignore this locator is passed mainly to test the code path that invokes createWithLocator
      shareableUrlLocatorParams,
    });

    const copyButton = screen.getByTestId('copyShareUrlButton');

    const numberOfClicks = 4;

    for (const _click of Array.from({ length: numberOfClicks })) {
      await user.click(copyButton);
    }

    // should only invoke once no matter how many times the button is clicked
    expect(createWithLocatorSpy).toHaveBeenCalledTimes(1);
    expect(copyButton.getAttribute('data-share-url')).toBe(shortURL);
  });

  it('invokes the createFromLongUrl method on the shortURL service if a locator is not present when the copy button is clicked', async () => {
    const user = userEvent.setup();
    const objectType = 'dashboard';
    const objectId = '123';
    const isDirty = false;

    const shortURL = 'http://localhost:5601/xyz/r/s/yellow-orange-tomato';

    const createFromLongUrlSpy = jest.spyOn(BrowserShortUrlClient.prototype, 'createFromLongUrl');

    // @ts-expect-error we only return url property, as that's all we need for this test
    createFromLongUrlSpy.mockResolvedValue({
      url: shortURL,
    });

    renderComponent({
      objectType,
      objectId,
      isDirty,
      shareableUrl,
      urlService,
      allowShortUrl: true,
    });

    const copyButton = screen.getByTestId('copyShareUrlButton');

    const numberOfClicks = 4;

    for (const _click of Array.from({ length: numberOfClicks })) {
      await user.click(copyButton);
    }

    // should only invoke once no matter how many times the button is clicked
    expect(createFromLongUrlSpy).toHaveBeenCalledTimes(1);
    expect(copyButton.getAttribute('data-share-url')).toBe(shortURL);
  });
});
