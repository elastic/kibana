/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import type { RenderHookResult } from '@testing-library/react-hooks';
import type {
  UseDefaultSectionsSizesParams,
  UseDefaultSectionsSizesResult,
} from './use_default_sections_sizes';
import { useDefaultSectionSizes } from './use_default_sections_sizes';

describe('useDefaultSectionSizes', () => {
  let hookResult: RenderHookResult<UseDefaultSectionsSizesParams, UseDefaultSectionsSizesResult>;

  it('should return all 0 if windowWidth is 0', () => {
    const initialProps = {
      windowWidth: 0,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current).toEqual({
      defaultRightSectionWidth: 0,
      defaultLeftSectionWidth: 0,
      defaultPreviewSectionWidth: 0,
    });
  });

  it('should return the window width for right and preview sections for tiny screen', () => {
    const initialProps = {
      windowWidth: 350,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current).toEqual({
      defaultRightSectionWidth: 350,
      defaultLeftSectionWidth: -48,
      defaultPreviewSectionWidth: 350,
    });
  });

  it('should return the remaining for left section', () => {
    const initialProps = {
      windowWidth: 500,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current).toEqual({
      defaultRightSectionWidth: 380,
      defaultLeftSectionWidth: 72,
      defaultPreviewSectionWidth: 380,
    });
  });

  it('should return sizes for large screen', () => {
    const initialProps = {
      windowWidth: 1300,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current.defaultRightSectionWidth).toBeGreaterThan(420);
    expect(hookResult.result.current.defaultRightSectionWidth).toBeLessThan(750);
    expect(hookResult.result.current.defaultLeftSectionWidth).toBeGreaterThan(420);
    expect(hookResult.result.current.defaultLeftSectionWidth).toBeLessThan(750);
    expect(hookResult.result.current.defaultPreviewSectionWidth).toEqual(
      hookResult.result.current.defaultRightSectionWidth
    );
  });

  it('should return 80% of remaining for left section', () => {
    const initialProps = {
      windowWidth: 2500,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current).toEqual({
      defaultRightSectionWidth: 750,
      defaultLeftSectionWidth: (2500 - 750) * 0.8,
      defaultPreviewSectionWidth: 750,
    });
  });

  it('should return max out at 1500px for really big screens', () => {
    const initialProps = {
      windowWidth: 2700,
    };
    hookResult = renderHook(
      (props: UseDefaultSectionsSizesParams) => useDefaultSectionSizes(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current).toEqual({
      defaultRightSectionWidth: 750,
      defaultLeftSectionWidth: 1500,
      defaultPreviewSectionWidth: 750,
    });
  });
});
