/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { keys } from '@elastic/eui';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
  METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ,
} from '../../../common/constants';
import { useSearchAction } from './use_search_action';
import type { UseSearchActionProps } from './use_search_action';

const DEBOUNCE_TIME = 300;

const defaultProps: UseSearchActionProps = {
  value: '',
  isFullscreen: false,
  onSearchTermChange: jest.fn(),
  onKeyDown: jest.fn(),
};

/**
 * Renders the search action the same way `IconButtonGroup` does: the collapsed state is a
 * button built from the returned descriptor, the expanded state is the returned input node.
 */
const Harness = (props: UseSearchActionProps) => {
  const { searchButton, searchInput } = useSearchAction(props);

  return (
    <>
      {searchButton ? (
        <button
          type="button"
          aria-label={searchButton.label}
          data-test-subj={searchButton['data-test-subj']}
          onClick={searchButton.onClick}
        />
      ) : null}
      {searchInput}
    </>
  );
};

describe('useSearchAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a search button descriptor and no input while collapsed', () => {
    const { result } = renderHook(() => useSearchAction(defaultProps));

    expect(result.current.searchInput).toBeUndefined();
    expect(result.current.searchButton).toEqual(
      expect.objectContaining({
        iconType: 'magnify',
        label: 'Search metrics',
        toolTipContent: 'Search metrics',
        'data-test-subj': METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
      })
    );
  });

  it('swaps the button for the input when the button is activated', () => {
    const { result } = renderHook(() => useSearchAction(defaultProps));

    act(() => {
      result.current.searchButton?.onClick();
    });

    expect(result.current.searchButton).toBeUndefined();
    expect(result.current.searchInput).toBeDefined();
  });

  it('auto-expands the input when a non-empty value is supplied', () => {
    const { result } = renderHook(() => useSearchAction({ ...defaultProps, value: 'cpu' }));

    expect(result.current.searchButton).toBeUndefined();
    expect(result.current.searchInput).toBeDefined();
  });

  it('returns a stable result object across re-renders so the toolbar memo does not churn', () => {
    const { result, rerender } = renderHook(() => useSearchAction(defaultProps));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  describe('with fake timers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('notifies of the search term after the debounce elapses', () => {
      const onSearchTermChange = jest.fn();
      render(<Harness {...defaultProps} onSearchTermChange={onSearchTermChange} />);

      act(() => {
        screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ).click();
      });

      const input = screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ);

      act(() => {
        fireEvent.change(input, { target: { value: 'cpu' } });
      });

      expect(onSearchTermChange).not.toHaveBeenCalledWith('cpu');

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_TIME);
      });

      expect(onSearchTermChange).toHaveBeenCalledWith('cpu');
    });
  });

  it('collapses and clears the search on Escape and still forwards the event', () => {
    const onKeyDown = jest.fn();
    const onSearchTermChange = jest.fn();
    render(
      <Harness {...defaultProps} onKeyDown={onKeyDown} onSearchTermChange={onSearchTermChange} />
    );

    act(() => {
      screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ).click();
    });

    const input = screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ);

    act(() => {
      fireEvent.change(input, { target: { value: 'cpu' } });
    });

    act(() => {
      fireEvent.keyDown(input, { key: keys.ESCAPE });
    });

    expect(onKeyDown).toHaveBeenCalled();
    expect(
      screen.queryByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ)
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ)).toBeInTheDocument();
  });

  it('forwards Escape without collapsing while in fullscreen', () => {
    const onKeyDown = jest.fn();
    render(<Harness {...defaultProps} isFullscreen onKeyDown={onKeyDown} />);

    act(() => {
      screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ).click();
    });

    const input = screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ);

    act(() => {
      fireEvent.keyDown(input, { key: keys.ESCAPE });
    });

    expect(onKeyDown).toHaveBeenCalled();
    expect(screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ)).toBeInTheDocument();
  });

  it('collapses on blur when the search term is empty', () => {
    render(<Harness {...defaultProps} />);

    act(() => {
      screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ).click();
    });

    act(() => {
      fireEvent.blur(screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ));
    });

    expect(
      screen.queryByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ)
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ)).toBeInTheDocument();
  });

  it('keeps the input open on blur when the search term is not empty', () => {
    render(<Harness {...defaultProps} />);

    act(() => {
      screen.getByTestId(METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ).click();
    });

    const input = screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ);

    act(() => {
      fireEvent.change(input, { target: { value: 'cpu' } });
    });

    act(() => {
      fireEvent.blur(input);
    });

    expect(screen.getByTestId(METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ)).toBeInTheDocument();
  });
});
