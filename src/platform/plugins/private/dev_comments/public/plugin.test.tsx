/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HttpFetchOptions } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { DeveloperToolbarStart } from '@kbn/developer-toolbar-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { COMMENTS_API_PATH, type Comment, type NewComment } from '../common';
import { DevCommentsPlugin } from './plugin';

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const query = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
const created: Comment = {
  id: 'created',
  createdAt: fiveMinutesAgo,
  updatedAt: fiveMinutesAgo,
  author: { username: 'anonymous', displayName: 'anonymous' },
  text: 'Needs a label',
  resolved: false,
  replies: [],
  route: { pageKey: '/', path: '/' },
  anchor: { locators: [{ type: 'id', value: 'target' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

describe('DevCommentsPlugin', () => {
  const page = document.createElement('div');

  beforeAll(() => {
    // jsdom has no layout; every element gets a box so anchors resolve and pins are on screen.
    Element.prototype.scrollIntoView = jest.fn();
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 10,
      left: 10,
      top: 10,
      width: 100,
      height: 20,
      right: 110,
      bottom: 30,
      toJSON: () => {},
    });
  });

  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    page.innerHTML = `<button type="button" id="target">Target</button>`;
    document.body.appendChild(page);
  });

  afterEach(() => page.remove());

  const startPlugin = () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue([]);
    core.http.post.mockResolvedValue(created);
    const developerToolbar: jest.Mocked<DeveloperToolbarStart> = {
      registerItem: jest.fn().mockReturnValue(() => {}),
    };
    const plugin = new DevCommentsPlugin(
      coreMock.createPluginInitializerContext({ enabled: true })
    );
    plugin.setup(coreMock.createSetup());
    plugin.start(core, { developerToolbar });
    return { core, developerToolbar };
  };

  it('mounts the layer with the toolbar item and stores comments through the API', async () => {
    const { core, developerToolbar } = startPlugin();
    expect(developerToolbar.registerItem).toHaveBeenCalledTimes(1);
    const [item] = developerToolbar.registerItem.mock.calls[0];

    // The toolbar renders inside core's chrome, which provides the intl context.
    render(
      <I18nProvider>
        <EuiThemeProvider>
          <div id="developerToolbar">{item.children}</div>
        </EuiThemeProvider>
      </I18nProvider>
    );
    await screen.findByTestId('devCommentsButton');
    await flush();

    fireEvent.click(screen.getByTestId('devCommentsButton'));
    fireEvent.keyDown(query('#target'), { key: 'Enter' });
    fireEvent.change(await screen.findByTestId('devCommentsComposerInput'), {
      target: { value: 'Needs a label' },
    });
    // No screenshot: jsdom cannot render one.
    fireEvent.click(screen.getByTestId('devCommentsAttachScreenshot'));
    fireEvent.click(screen.getByTestId('devCommentsComposerSubmit'));

    await waitFor(() =>
      expect(core.http.post).toHaveBeenCalledWith(COMMENTS_API_PATH, expect.anything())
    );
    // The overloads of `http.post` type its recorded calls after the last one; the request is the first.
    const [, options] = core.http.post.mock.calls[0] as unknown as [string, HttpFetchOptions];
    const sent: NewComment = JSON.parse(String(options.body));
    expect(sent).toEqual(
      expect.objectContaining({ text: 'Needs a label', route: { pageKey: '/', path: '/' } })
    );
    expect(await screen.findAllByText('5 minutes ago')).not.toHaveLength(0);
  });

  it('registers nothing outside dev mode, when disabled, or without the toolbar', () => {
    const core = coreMock.createStart();
    const developerToolbar: jest.Mocked<DeveloperToolbarStart> = {
      registerItem: jest.fn().mockReturnValue(() => {}),
    };

    const disabled = new DevCommentsPlugin(
      coreMock.createPluginInitializerContext({ enabled: false })
    );
    disabled.start(core, { developerToolbar });

    const context = coreMock.createPluginInitializerContext({ enabled: true });
    const prod = new DevCommentsPlugin({
      ...context,
      env: { ...context.env, mode: { ...context.env.mode, dev: false } },
    });
    prod.start(core, { developerToolbar });

    new DevCommentsPlugin(coreMock.createPluginInitializerContext({ enabled: true })).start(
      core,
      {}
    );

    expect(developerToolbar.registerItem).not.toHaveBeenCalled();
  });
});
