/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { applyLogLevelHighlighting, highlightLogLevelsInString } from './content';

const mockEuiTheme = {
  colors: {
    textInk: '#000000',
  },
} as unknown as EuiThemeComputed;

describe('highlightLogLevelsInString', () => {
  it('highlights a log level term', () => {
    const result = highlightLogLevelsInString('Test INFO message', mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    const span = container.querySelector('[data-test-subj="logLevelSpan"]');
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent('INFO');
  });

  it('returns text unchanged when no log level is present', () => {
    const text = 'Just a regular message without levels';
    const result = highlightLogLevelsInString(text, mockEuiTheme, false);
    expect(result).toBe(text);
  });

  it('highlights multiple log levels in a string', () => {
    const result = highlightLogLevelsInString(
      'INFO: Starting... WARN: Issue found ERROR: Failed',
      mockEuiTheme,
      false
    );
    const { container } = render(<>{result}</>);

    expect(container.querySelectorAll('[data-test-subj="logLevelSpan"]').length).toBe(3);
  });

  it('preserves surrounding text', () => {
    const result = highlightLogLevelsInString('prefix INFO suffix', mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('prefix INFO suffix');
  });

  it('applies different background colors per severity level', () => {
    const { container: infoContainer } = render(
      <>{highlightLogLevelsInString('INFO message', mockEuiTheme, false)}</>
    );
    const { container: errorContainer } = render(
      <>{highlightLogLevelsInString('ERROR message', mockEuiTheme, false)}</>
    );

    const infoSpan = infoContainer.querySelector('[data-test-subj="logLevelSpan"]') as HTMLElement;
    const errorSpan = errorContainer.querySelector(
      '[data-test-subj="logLevelSpan"]'
    ) as HTMLElement;

    expect(infoSpan?.style.backgroundColor).toBeTruthy();
    expect(errorSpan?.style.backgroundColor).toBeTruthy();
    expect(infoSpan?.style.backgroundColor).not.toBe(errorSpan?.style.backgroundColor);
  });
});

describe('applyLogLevelHighlighting', () => {
  it('returns string unchanged when no log level is present', () => {
    const text = 'No log level here';
    expect(applyLogLevelHighlighting(text, mockEuiTheme, false)).toBe(text);
  });

  it('processes children of React elements', () => {
    const result = applyLogLevelHighlighting(<span>INFO: Test message</span>, mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    expect(container.querySelector('span')).toBeInTheDocument();
    expect(container.querySelector('[data-test-subj="logLevelSpan"]')).toBeInTheDocument();
  });

  it('preserves element without children unchanged', () => {
    const { container } = render(<>{applyLogLevelHighlighting(<br />, mockEuiTheme, false)}</>);
    expect(container.innerHTML).toBe('<br>');
  });

  it('preserves search highlight marks while adding log level highlights', () => {
    const node = (
      <>
        INFO: User <mark className="ffSearch__highlight">search term</mark> logged
      </>
    );
    const result = applyLogLevelHighlighting(node, mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    expect(container.querySelector('mark.ffSearch__highlight')).toHaveTextContent('search term');
    expect(container.querySelector('[data-test-subj="logLevelSpan"]')).toHaveTextContent('INFO');
    expect(container.textContent).toBe('INFO: User search term logged');
  });

  it('processes each element in an array', () => {
    const result = applyLogLevelHighlighting(
      ['INFO: First ', 'ERROR: Second'],
      mockEuiTheme,
      false
    );
    const { container } = render(<>{result}</>);

    expect(container.querySelectorAll('[data-test-subj="logLevelSpan"]').length).toBe(2);
  });

  it('recursively processes deeply nested elements', () => {
    const node = (
      <div>
        <span>
          <strong>INFO: Nested</strong>
        </span>
      </div>
    );
    const result = applyLogLevelHighlighting(node, mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    expect(container.querySelector('[data-test-subj="logLevelSpan"]')).toBeInTheDocument();
    expect(container.querySelector('div > span > strong')).toBeInTheDocument();
  });

  it('returns null, undefined, and boolean unchanged', () => {
    expect(applyLogLevelHighlighting(null, mockEuiTheme, false)).toBeNull();
    expect(applyLogLevelHighlighting(undefined, mockEuiTheme, false)).toBeUndefined();
    expect(applyLogLevelHighlighting(true as unknown as ReactNode, mockEuiTheme, false)).toBe(true);
  });
});

describe('search highlights + log level highlights', () => {
  it('handles log level inside search highlight', () => {
    const result = applyLogLevelHighlighting(
      <mark className="ffSearch__highlight">INFO</mark>,
      mockEuiTheme,
      false
    );
    const { container } = render(<>{result}</>);

    expect(container.querySelector('mark')).toBeInTheDocument();
    expect(container.querySelector('[data-test-subj="logLevelSpan"]')).toHaveTextContent('INFO');
  });

  it('handles multiple search highlights with log levels between them', () => {
    const node = (
      <>
        <mark className="ffSearch__highlight">request</mark> INFO: Processing{' '}
        <mark className="ffSearch__highlight">request</mark> complete
      </>
    );
    const result = applyLogLevelHighlighting(node, mockEuiTheme, false);
    const { container } = render(<>{result}</>);

    expect(container.querySelectorAll('mark.ffSearch__highlight').length).toBe(2);
    expect(container.querySelector('[data-test-subj="logLevelSpan"]')).toHaveTextContent('INFO');
  });
});
