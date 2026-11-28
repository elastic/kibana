/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSerializer } from '@emotion/jest';
import { jsx } from '@emotion/react';
import { render, renderHook } from '@testing-library/react';
import { useComparisonCss } from './use_comparison_css';

expect.addSnapshotSerializer(createSerializer({ includeStyles: true }));

const renderComparisonStyles = (styles: ReturnType<typeof useComparisonCss>) => {
  const { container } = render(jsx('div', { css: styles }));
  return container.firstChild;
};

describe('useComparisonCss', () => {
  it('should render with no diff mode and no diff decorations', () => {
    const { result } = renderHook(() => useComparisonCss({}));
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with basic diff mode and no diff decorations', () => {
    const { result } = renderHook(() => useComparisonCss({ diffMode: 'basic' }));
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with basic diff mode and diff decorations', () => {
    const { result } = renderHook(() =>
      useComparisonCss({ diffMode: 'basic', showDiffDecorations: true })
    );
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with chars diff mode and no diff decorations', () => {
    const { result } = renderHook(() => useComparisonCss({ diffMode: 'chars' }));
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with chars diff mode and diff decorations', () => {
    const { result } = renderHook(() =>
      useComparisonCss({ diffMode: 'chars', showDiffDecorations: true })
    );
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with words diff mode and no diff decorations', () => {
    const { result } = renderHook(() => useComparisonCss({ diffMode: 'words' }));
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with words diff mode and diff decorations', () => {
    const { result } = renderHook(() =>
      useComparisonCss({ diffMode: 'words', showDiffDecorations: true })
    );
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with lines diff mode and no diff decorations', () => {
    const { result } = renderHook(() => useComparisonCss({ diffMode: 'lines' }));
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });

  it('should render with lines diff mode and diff decorations', () => {
    const { result } = renderHook(() =>
      useComparisonCss({ diffMode: 'lines', showDiffDecorations: true })
    );
    expect(renderComparisonStyles(result.current)).toMatchSnapshot();
  });
});
