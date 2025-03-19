/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import * as Rx from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterceptDisplayManager } from './intercept_display_manager';
import { Intercept } from '@kbn/core-notifications-browser/src/types';

describe('InterceptDisplayManager', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;

  beforeAll(() => {
    window.requestIdleCallback = jest.fn().mockImplementation((cb) => cb());
  });

  afterAll(() => {
    window.requestIdleCallback = originalRequestIdleCallback;
  });

  it('does not render the dialog shell when there is not intercept to display', () => {
    const ackProductIntercept = jest.fn();
    const intercept$ = new Rx.BehaviorSubject<Intercept>({
      id: '1',
      title: 'title',
      steps: [],
      onFinish: jest.fn(),
    });

    render(<InterceptDisplayManager ackIntercept={ackProductIntercept} intercept$={intercept$} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog shell when there is an intercept to display', () => {
    const ackProductIntercept = jest.fn();

    const interceptStep: Intercept['steps'][number] = {
      id: 'hello',
      title: 'Hello World',
      content: () => <>{'This is a test'}</>,
    };

    const intercept$ = new Rx.BehaviorSubject<Intercept>({
      id: '1',
      title: 'title',
      steps: [interceptStep],
      onFinish: jest.fn(),
    });

    render(<InterceptDisplayManager ackIntercept={ackProductIntercept} intercept$={intercept$} />);

    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(screen.getByTestId(`interceptStep-${interceptStep.id}`)).not.toBeNull();
    expect(screen.getByText('Hello World')).not.toBeNull();
    expect(screen.getByText('This is a test')).not.toBeNull();
  });

  it('closes the dialog and calls the provided ack function when the close button is clicked', async () => {
    const user = userEvent.setup();

    const ackProductIntercept = jest.fn();
    const intercept$ = new Rx.BehaviorSubject<Intercept>({
      id: '1',
      title: 'title',
      steps: [
        {
          id: 'hello',
          title: 'Hello World',
          content: () => <>{'This is a test'}</>,
        },
      ],
      onFinish: jest.fn(),
    });

    render(<InterceptDisplayManager ackIntercept={ackProductIntercept} intercept$={intercept$} />);

    expect(screen.queryByRole('dialog')).not.toBeNull();

    await user.click(screen.getByTestId('productInterceptDismiss'));

    expect(ackProductIntercept).toHaveBeenCalledWith('1', 'dismissed');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('invokes the passed onProgress handler with the response the user provides feedback', async () => {
    const user = userEvent.setup();

    const ackProductIntercept = jest.fn();

    const productIntercept: Intercept = {
      id: '1',
      title: 'title',
      steps: [
        {
          id: 'hello',
          title: 'Hello World',
          content: function InterceptContentTest({ onValue }) {
            return (
              <input
                data-test-subj="intercept-test-input"
                onChange={(evt) => {
                  onValue(evt.target.value);
                }}
              />
            );
          },
        },
      ],
      onProgress: jest.fn(),
      onFinish: jest.fn(),
    };

    const intercept$ = new Rx.BehaviorSubject<Intercept>(productIntercept);

    render(<InterceptDisplayManager ackIntercept={ackProductIntercept} intercept$={intercept$} />);

    expect(screen.queryByRole('dialog')).not.toBeNull();

    expect(screen.queryByTestId('intercept-test-input')).not.toBeNull();

    await user.type(screen.getByTestId('intercept-test-input'), 'test');

    await waitFor(() => expect(productIntercept.onProgress).toHaveBeenCalledWith('hello', 'test'));
  });
});
