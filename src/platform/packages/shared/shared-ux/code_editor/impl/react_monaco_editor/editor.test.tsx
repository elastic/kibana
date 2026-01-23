/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from '@kbn/monaco';
import { render, screen } from '@testing-library/react';
import { MonacoEditor, OVERFLOW_WIDGETS_TEST_ID } from './editor';
import * as supportedLanguages from './languages/supported';

const defaultProps: Partial<ComponentProps<typeof MonacoEditor>> = {
  options: {},
  editorDidMount: jest.fn(),
  editorWillMount: jest.fn(),
  editorWillUnmount: jest.fn(),
};

describe('react monaco editor', () => {
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (contextId, options) =>
        ({
          webkitBackingStorePixelRatio: 1,
        } as unknown as RenderingContext)
    );
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('registers all supported languages', () => {
    render(<MonacoEditor {...defaultProps} />);

    const configuredLanguages = window.MonacoEnvironment?.monaco.languages.getLanguages();

    Object.values(supportedLanguages).forEach((v) => {
      expect(configuredLanguages?.some((l) => l?.id === v)).toBe(true);
    });
  });

  it('registers the default theme', () => {
    const defineThemeSpy = jest.spyOn(window.MonacoEnvironment?.monaco.editor!, 'defineTheme');

    render(<MonacoEditor {...defaultProps} />);

    expect(defineThemeSpy).toHaveBeenCalled();
    expect(defineThemeSpy).toHaveBeenCalledWith(CODE_EDITOR_DEFAULT_THEME_ID, expect.any(Object));
    expect(defineThemeSpy).toHaveBeenCalledWith(
      CODE_EDITOR_TRANSPARENT_THEME_ID,
      expect.any(Object)
    );
  });

  it('renders the overflow widgets into a portal', () => {
    render(<MonacoEditor {...defaultProps} />);

    expect(screen.getByTestId(OVERFLOW_WIDGETS_TEST_ID)).toBeDefined();
  });
});
