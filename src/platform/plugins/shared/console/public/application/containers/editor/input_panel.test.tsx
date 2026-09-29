/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render, screen } from '@testing-library/react';
import { Subject } from 'rxjs';
import { InputPanel } from './input_panel';
import { useEditorReadContext } from '../../contexts';
import { getAutocompleteInfo } from '../../../services';
import { DEBOUNCE_DELAY } from '../../const';

const mockMonacoEditor = vi.fn((props: Record<string, unknown>) => (
  <div data-test-subj="mockMonacoEditor" />
));

vi.mock('../../contexts', () => {
      const mocked = {
      useEditorReadContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../services', () => {
      const mocked = {
      getAutocompleteInfo: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./monaco_editor', () => {
      const mocked = {
      MonacoEditor: (props: Record<string, unknown>) => mockMonacoEditor(props),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../components/editor_content_spinner', () => {
      const mocked = {
      EditorContentSpinner: () => <div data-test-subj="mockEditorContentSpinner" />,
    };
      return { ...mocked, default: mocked };
    });

const mockUseEditorReadContext = useEditorReadContext as MockedFunction<
  typeof useEditorReadContext
>;

const mockGetAutocompleteInfo = getAutocompleteInfo as MockedFunction<
  typeof getAutocompleteInfo
>;

describe('InputPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when there is no current text object', () => {
    const isLoading$ = new Subject<boolean>();
    const unsubscribe = vi.fn();
    mockGetAutocompleteInfo.mockReturnValue({
      isLoading$: {
        subscribe: () => ({ unsubscribe }),
      },
    } as any);

    mockUseEditorReadContext.mockReturnValue({
      currentTextObject: null,
      customParsedRequestsProvider: undefined,
    } as any);

    const { container, unmount } = render(
      <InputPanel
        loading={false}
        inputEditorValue="abc"
        setInputEditorValue={vi.fn()}
        setFetchingAutocompleteEntities={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
    isLoading$.complete();
  });

  it('renders spinner when loading is true', () => {
    const unsubscribe = vi.fn();
    mockGetAutocompleteInfo.mockReturnValue({
      isLoading$: {
        subscribe: () => ({ unsubscribe }),
      },
    } as any);

    mockUseEditorReadContext.mockReturnValue({
      currentTextObject: { text: 'from storage' },
      customParsedRequestsProvider: undefined,
    } as any);

    const { unmount } = render(
      <InputPanel
        loading={true}
        inputEditorValue="abc"
        setInputEditorValue={vi.fn()}
        setFetchingAutocompleteEntities={vi.fn()}
      />
    );

    expect(screen.getByTestId('mockEditorContentSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('mockMonacoEditor')).not.toBeInTheDocument();

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('renders monaco editor with expected props when not loading', () => {
    const unsubscribe = vi.fn();
    const setInputEditorValue = vi.fn();
    const customParsedRequestsProvider = { foo: 'bar' };

    mockGetAutocompleteInfo.mockReturnValue({
      isLoading$: {
        subscribe: () => ({ unsubscribe }),
      },
    } as any);

    mockUseEditorReadContext.mockReturnValue({
      currentTextObject: { text: 'from storage' },
      customParsedRequestsProvider,
    } as any);

    render(
      <InputPanel
        loading={false}
        inputEditorValue="abc"
        setInputEditorValue={setInputEditorValue}
        setFetchingAutocompleteEntities={vi.fn()}
      />
    );

    expect(screen.getByTestId('mockMonacoEditor')).toBeInTheDocument();
    expect(mockMonacoEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        localStorageValue: 'from storage',
        value: 'abc',
        setValue: setInputEditorValue,
        customParsedRequestsProvider,
      })
    );
  });

  it('debounces setFetchingAutocompleteEntities based on isLoading$ emissions', () => {
    const isLoading$ = new Subject<boolean>();
    const innerSubscription = isLoading$.subscribe();
    const unsubscribe = vi.fn(() => innerSubscription.unsubscribe());

    mockGetAutocompleteInfo.mockReturnValue({
      isLoading$: {
        subscribe: (handler: (v: boolean) => void) => {
          const sub = isLoading$.subscribe(handler);
          return {
            unsubscribe: () => sub.unsubscribe(),
          };
        },
      },
    } as any);

    mockUseEditorReadContext.mockReturnValue({
      currentTextObject: { text: 'from storage' },
      customParsedRequestsProvider: undefined,
    } as any);

    const setFetchingAutocompleteEntities = vi.fn();

    const { unmount } = render(
      <InputPanel
        loading={false}
        inputEditorValue="abc"
        setInputEditorValue={vi.fn()}
        setFetchingAutocompleteEntities={setFetchingAutocompleteEntities}
      />
    );

    act(() => {
      isLoading$.next(true);
    });
    expect(setFetchingAutocompleteEntities).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY);
    });
    expect(setFetchingAutocompleteEntities).toHaveBeenCalledWith(true);

    unmount();
    isLoading$.complete();
    unsubscribe();
  });

  it('cancels pending debounce and unsubscribes on unmount', () => {
    const isLoading$ = new Subject<boolean>();
    const unsubscribe = vi.fn();

    mockGetAutocompleteInfo.mockReturnValue({
      isLoading$: {
        subscribe: (handler: (v: boolean) => void) => {
          const sub = isLoading$.subscribe(handler);
          return {
            unsubscribe: () => {
              unsubscribe();
              sub.unsubscribe();
            },
          };
        },
      },
    } as any);

    mockUseEditorReadContext.mockReturnValue({
      currentTextObject: { text: 'from storage' },
      customParsedRequestsProvider: undefined,
    } as any);

    const setFetchingAutocompleteEntities = vi.fn();

    const { unmount } = render(
      <InputPanel
        loading={false}
        inputEditorValue="abc"
        setInputEditorValue={vi.fn()}
        setFetchingAutocompleteEntities={setFetchingAutocompleteEntities}
      />
    );

    act(() => {
      isLoading$.next(true);
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY);
    });

    expect(setFetchingAutocompleteEntities).not.toHaveBeenCalled();
    isLoading$.complete();
  });
});
