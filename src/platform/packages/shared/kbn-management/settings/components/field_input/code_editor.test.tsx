/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';

import { CodeEditor } from './code_editor';

const EDITOR_TEST_SUBJ = 'mockKibanaCodeEditor';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-test-subj="mockKibanaCodeEditor" />,
  MARKDOWN_LANG_ID: 'markdown',
  XJSON_LANG_ID: 'xjson',
}));

type IntersectionCallback = (
  entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting'>>
) => void;

describe('CodeEditor', () => {
  const defaultProps = {
    'aria-label': 'Some field',
    name: 'some-field-editor',
    type: 'json' as const,
    isReadOnly: false,
    value: '{}',
  };

  describe('WHEN IntersectionObserver is available', () => {
    const originalIntersectionObserver = global.IntersectionObserver;
    let intersectionCallback: IntersectionCallback;
    const disconnect = jest.fn();

    beforeEach(() => {
      disconnect.mockClear();
      global.IntersectionObserver = jest.fn((callback: IntersectionCallback) => {
        intersectionCallback = callback;
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
      }) as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
      global.IntersectionObserver = originalIntersectionObserver;
    });

    it('SHOULD NOT render the editor before it becomes visible', () => {
      const { queryByTestId } = render(<CodeEditor {...defaultProps} />);
      expect(queryByTestId(EDITOR_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('SHOULD render the editor once it becomes visible', () => {
      const { queryByTestId } = render(<CodeEditor {...defaultProps} />);

      act(() => intersectionCallback([{ isIntersecting: true }]));

      expect(queryByTestId(EDITOR_TEST_SUBJ)).toBeInTheDocument();
      expect(disconnect).toHaveBeenCalled();
    });

    it('SHOULD keep the editor mounted after it has been visible', () => {
      const { queryByTestId } = render(<CodeEditor {...defaultProps} />);

      act(() => intersectionCallback([{ isIntersecting: true }]));
      act(() => intersectionCallback([{ isIntersecting: false }]));

      expect(queryByTestId(EDITOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('WHEN IntersectionObserver is unavailable', () => {
    it('SHOULD render the editor immediately', () => {
      const { queryByTestId } = render(<CodeEditor {...defaultProps} />);
      expect(queryByTestId(EDITOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });
});
