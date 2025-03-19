/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import { TryInConsoleButton, TryInConsoleButtonProps } from './try_in_console_button';

describe('TryInConsoleButton', () => {
  let windowOpenSpy: jest.SpyInstance;
  const mockApplication = {
    capabilities: {
      dev_tools: {
        show: true,
      },
    },
  };
  const mockLocatorUseUrl = jest.fn();
  const mockLocatorGet = jest.fn().mockReturnValue({
    useUrl: mockLocatorUseUrl,
  });
  const mockShare = {
    url: {
      locators: {
        get: mockLocatorGet,
      },
    },
  };
  const mockConsole = {
    openEmbeddedConsole: jest.fn(),
    isEmbeddedConsoleAvailable: jest.fn(),
  };

  const defaultProps = ({
    request,
    application,
    consolePlugin,
    sharePlugin,
    content,
    showIcon,
    type,
  }: Partial<TryInConsoleButtonProps>) => ({
    application: (application ?? mockApplication) as ApplicationStart,
    sharePlugin: (sharePlugin ?? mockShare) as SharePluginStart | undefined,
    request,
    consolePlugin,
    content,
    showIcon,
    type,
  });
  beforeEach(() => {
    jest.resetAllMocks();
    windowOpenSpy = jest.spyOn(window, 'open');
    windowOpenSpy.mockImplementation(() => {});
    mockLocatorUseUrl.mockReturnValue('/app/test/dev_tools');
    mockLocatorGet.mockReturnValue({
      useUrl: mockLocatorUseUrl,
    });
  });
  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('renders expected button', async () => {
    const props: Partial<TryInConsoleButtonProps> = { request: 'GET /_stats' };
    const wrapper = render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(wrapper.getByTestId('tryInConsoleButton')).toBeTruthy();
    expect(wrapper.getByRole('button')).toHaveTextContent('Run in Console');
    expect(mockLocatorUseUrl).toHaveBeenCalledWith(
      {
        loadFrom: 'data:text/plain,OIUQKgBA9A+gzgFwIYLkA',
      },
      undefined,
      [props.request]
    );
  });
  it('can render as a link', async () => {
    const props: Partial<TryInConsoleButtonProps> = { request: 'GET /_stats', type: 'link' };
    const wrapper = render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(wrapper.getByTestId('tryInConsoleLink')).toBeTruthy();
    expect(wrapper.getByRole('button')).toHaveTextContent('Run in Console');
  });
  it('renders null if dev tools are unavailable', async () => {
    const props: Partial<TryInConsoleButtonProps> = {
      application: {
        capabilities: {
          dev_tools: {
            show: false,
          },
        },
      } as unknown as ApplicationStart,
    };
    render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(screen.queryAllByTestId('tryInConsoleButton').length).toBe(0);
    expect(screen.queryAllByTestId('tryInConsoleLink').length).toBe(0);
  });
  it('renders null if share plugin url is unavailable', async () => {
    const props: Partial<TryInConsoleButtonProps> = {
      sharePlugin: {} as unknown as SharePluginStart,
    };
    render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(screen.queryAllByTestId('tryInConsoleButton').length).toBe(0);
    expect(screen.queryAllByTestId('tryInConsoleLink').length).toBe(0);
  });
  it('renders null cant build dev tools url with share plugin', async () => {
    const props: Partial<TryInConsoleButtonProps> = {
      sharePlugin: {
        url: {
          locators: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      } as unknown as SharePluginStart,
    };
    render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(screen.queryAllByTestId('tryInConsoleButton').length).toBe(0);
    expect(screen.queryAllByTestId('tryInConsoleLink').length).toBe(0);
  });
  it('can use custom content', async () => {
    const props: Partial<TryInConsoleButtonProps> = {
      request: 'GET /_stats',
      content: 'Try my console!!',
    };
    const wrapper = render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(wrapper.getByTestId('tryInConsoleButton')).toBeTruthy();
    expect(wrapper.getByRole('button')).toHaveTextContent('Try my console!!');
  });
  it('can use custom content with a link', async () => {
    const props: Partial<TryInConsoleButtonProps> = {
      request: 'GET /_stats',
      content: 'Try my console!!',
      type: 'link',
    };
    const wrapper = render(<TryInConsoleButton {...defaultProps(props)} />);

    expect(wrapper.getByTestId('tryInConsoleLink')).toBeTruthy();
    expect(wrapper.getByRole('button')).toHaveTextContent('Try my console!!');
  });
  it('opens expected location in new tab', async () => {
    const props: Partial<TryInConsoleButtonProps> = { request: 'GET /_stats' };
    render(<TryInConsoleButton {...defaultProps(props)} />);

    fireEvent.click(screen.getByText('Run in Console'));

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy).toHaveBeenCalledWith('/app/test/dev_tools', '_blank', 'noreferrer');
  });
  it('can open in new tab without data', async () => {
    render(<TryInConsoleButton {...defaultProps({})} />);

    fireEvent.click(screen.getByText('Run in Console'));

    expect(mockLocatorUseUrl).toHaveBeenCalledWith({}, undefined, [undefined]);
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy).toHaveBeenCalledWith('/app/test/dev_tools', '_blank', 'noreferrer');
  });
  it('opens persistent console when available', async () => {
    mockConsole.isEmbeddedConsoleAvailable.mockReturnValue(true);
    render(
      <TryInConsoleButton
        {...defaultProps({ request: 'GET /_stats', consolePlugin: mockConsole })}
      />
    );

    fireEvent.click(screen.getByText('Run in Console'));

    expect(windowOpenSpy).toHaveBeenCalledTimes(0);
    expect(mockConsole.openEmbeddedConsole).toHaveBeenCalledTimes(1);
    expect(mockConsole.openEmbeddedConsole).toHaveBeenCalledWith('GET /_stats');
  });
  it('opens a new tab is persistent console is not available on the page', async () => {
    mockConsole.isEmbeddedConsoleAvailable.mockReturnValue(false);
    render(<TryInConsoleButton {...defaultProps({ consolePlugin: mockConsole })} />);

    fireEvent.click(screen.getByText('Run in Console'));

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(mockConsole.openEmbeddedConsole).toHaveBeenCalledTimes(0);
  });
});
