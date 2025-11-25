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
import { EmbedContent } from './embed_content';
import type { BrowserUrlService } from '../../../types';
import { urlServiceTestSetup } from '../../../../common/url_service/__tests__/setup';
import type { IShareContext } from '../../context';
import { ShareProvider } from '../../context';

let urlService: BrowserUrlService;

// @ts-expect-error there is a type error because we override the shortUrls implementation
// eslint-disable-next-line prefer-const
({ service: urlService } = urlServiceTestSetup());

const shortUrlService = urlService.shortUrls.get(null)!;

const defaultProps: Pick<
  ComponentProps<typeof EmbedContent>,
  | 'allowShortUrl'
  | 'isDirty'
  | 'shareableUrl'
  | 'objectType'
  | 'shortUrlService'
  | 'anonymousAccess'
> = {
  isDirty: false,
  objectType: 'dashboard',
  shareableUrl: '/home#/',
  shortUrlService,
  allowShortUrl: false,
  anonymousAccess: { getState: jest.fn(), getCapabilities: jest.fn() },
};

const mockShareContext: IShareContext = {
  ...defaultProps,
  onClose: jest.fn(),
  shareMenuItems: [],
  objectTypeMeta: {
    title: 'title',
    config: {},
  },
  sharingData: { title: 'title', url: 'url' },
};

const renderComponent = (
  props: ComponentProps<typeof EmbedContent>,
  shareContext: IShareContext = mockShareContext
) => {
  return render(
    <IntlProvider locale="en">
      <ShareProvider shareContext={shareContext}>
        <EmbedContent {...props} />
      </ShareProvider>
    </IntlProvider>
  );
};

describe('Share modal embed content tab', () => {
  describe('share url embedded', () => {
    beforeAll(() => {
      Object.defineProperty(document, 'execCommand', {
        value: jest.fn(() => true),
      });
    });

    it('works for simple url', async () => {
      const user = userEvent.setup();

      renderComponent({ ...defaultProps, shareableUrl: 'http://localhost:5601/app/home#/' });

      const copyButton = screen.getByTestId('copyEmbedUrlButton');

      await user.click(copyButton);

      await waitFor(() => {
        expect(copyButton.getAttribute('data-share-url')).toBe(
          '<iframe src="http://localhost:5601/app/home#/?embed=true&_g=" height="600" width="800"></iframe>'
        );
      });
    });

    it('works if the url has a query string', async () => {
      const user = userEvent.setup();

      renderComponent({
        ...defaultProps,
        shareableUrl:
          'http://localhost:5601/app/dashboards#/create?_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-15m%2Cto%3Anow))',
      });

      const copyButton = screen.getByTestId('copyEmbedUrlButton');

      await user.click(copyButton);

      await waitFor(() => {
        expect(copyButton.getAttribute('data-share-url')).toBe(
          '<iframe src="http://localhost:5601/app/dashboards#/create?embed=true&_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-15m%2Cto%3Anow))" height="600" width="800"></iframe>'
        );
      });
    });
  });

  it('renders a draft mode callout when dirty and triggers its save button', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const shareContext: IShareContext = {
      ...mockShareContext,
      onSave,
      isDirty: true,
    };
    renderComponent(
      {
        ...defaultProps,
        isDirty: true,
        objectConfig: {
          draftModeCallOut: true,
        },
      },
      shareContext
    );
    const draftModeCallout = screen.getByTestId('unsavedChangesDraftModeCallOut');
    expect(draftModeCallout).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    expect(saveButton).toBeInTheDocument();
    await user.click(saveButton);
    expect(onSave).toHaveBeenCalled();
  });

  it('renders a draft mode callout when dirty and does not render a save button when onSave is not provided', () => {
    const shareContext: IShareContext = {
      ...mockShareContext,
      isDirty: true,
    };
    renderComponent(
      {
        ...defaultProps,
        isDirty: true,
        objectConfig: {
          draftModeCallOut: true,
        },
      },
      shareContext
    );
    const draftModeCallout = screen.getByTestId('unsavedChangesDraftModeCallOut');
    expect(draftModeCallout).toBeInTheDocument();
    const saveButton = screen.queryByRole('button', { name: 'Save changes' });
    expect(saveButton).not.toBeInTheDocument();
  });
});
