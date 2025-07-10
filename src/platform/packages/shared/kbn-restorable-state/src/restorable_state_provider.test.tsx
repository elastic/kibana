/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRestorableStateProvider } from './restorable_state_provider';

interface RestorableState {
  count?: number;
  message?: string;
  anotherMessage?: string;
}

describe('createRestorableStateProvider', () => {
  it('withRestorableState should work correctly', async () => {
    const { withRestorableState, useRestorableState } =
      createRestorableStateProvider<RestorableState>();

    const MockChildComponent = () => {
      const [message, setMessage] = useRestorableState('message', 'Hello');
      const [count, setCount] = useRestorableState('count', 0);
      return (
        <button
          data-test-subj="message-button"
          onClick={() => {
            setMessage((value) => `${value} World`);
            setCount((value) => (value || 0) + 1);
          }}
        >
          {message} - {count || 0}
        </button>
      );
    };

    const MockParentComponent = () => {
      const [anotherMessage, setAnotherMessage] = useRestorableState('anotherMessage', '+');
      return (
        <div>
          <MockChildComponent />
          <button
            data-test-subj="another-message-button"
            onClick={() => {
              setAnotherMessage((value) => `${value}+`);
            }}
          >
            {anotherMessage}
          </button>
        </div>
      );
    };

    const WrappedComponent = withRestorableState(MockParentComponent);

    let mockStoredState: RestorableState | undefined;
    const props: ComponentProps<typeof WrappedComponent> = {
      initialState: undefined,
      onInitialStateChange: jest.fn((state) => {
        mockStoredState = state;
      }),
    };

    render(<WrappedComponent {...props} />);

    const button = screen.getByTestId('message-button');
    expect(button).toHaveTextContent('Hello');
    expect(props.onInitialStateChange).not.toHaveBeenCalled();
    await userEvent.click(button);
    await userEvent.click(button);
    expect(button).toHaveTextContent('Hello World World - 2');
    expect(props.onInitialStateChange).toHaveBeenCalledTimes(4);
    expect(mockStoredState).toEqual({ message: 'Hello World World', count: 2 });

    const anotherButton = screen.getByTestId('another-message-button');
    expect(anotherButton).toHaveTextContent('+');
    await userEvent.click(anotherButton);
    expect(anotherButton).toHaveTextContent('++');
    expect(props.onInitialStateChange).toHaveBeenCalledTimes(5);
    expect(mockStoredState).toEqual({
      message: 'Hello World World',
      count: 2,
      anotherMessage: '++',
    });

    const propsWithSavedState: ComponentProps<typeof WrappedComponent> = {
      initialState: { message: 'Hi', anotherMessage: '---' },
      onInitialStateChange: jest.fn((state) => {
        mockStoredState = state;
      }),
    };

    render(<WrappedComponent {...propsWithSavedState} />);
    expect(screen.getAllByTestId('message-button')[1]).toHaveTextContent('Hi - 0');
    expect(screen.getAllByTestId('another-message-button')[1]).toHaveTextContent('---');
  });

  it('useRestorableRef should work correctly', async () => {
    const { withRestorableState, useRestorableRef } =
      createRestorableStateProvider<RestorableState>();

    const MockChildComponent = () => {
      const countRef = useRestorableRef('count', 0);
      return (
        <button
          data-test-subj="count-button"
          onClick={() => {
            countRef.current = (countRef.current || 0) + 1;
          }}
        >
          {countRef.current || 0}
        </button>
      );
    };

    const MockParentComponent = () => {
      const [isVisible, setIsVisible] = useState(true);
      return (
        <div>
          {isVisible && <MockChildComponent />}
          <button onClick={() => setIsVisible(false)}>Hide</button>
        </div>
      );
    };

    const WrappedComponent = withRestorableState(MockParentComponent);

    let mockStoredState: RestorableState | undefined;
    const props: ComponentProps<typeof WrappedComponent> = {
      initialState: undefined,
      onInitialStateChange: jest.fn((state) => {
        mockStoredState = state;
      }),
    };

    render(<WrappedComponent {...props} />);

    const button = screen.getByTestId('count-button');
    expect(button).toHaveTextContent('0');
    expect(props.onInitialStateChange).not.toHaveBeenCalled();
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);
    expect(props.onInitialStateChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('Hide'));
    expect(props.onInitialStateChange).toHaveBeenCalled();
    expect(mockStoredState).toEqual({ count: 3 });

    render(<WrappedComponent {...props} initialState={{ count: 5 }} />);
    expect(screen.getByTestId('count-button')).toHaveTextContent('5');
  });
});
