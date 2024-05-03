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
import type { UseFlyoutWidthParams } from './use_flyout_width';
import { useFlyoutWidth } from './use_flyout_width';

describe('useFlyoutWidth', () => {
  let hookResult: RenderHookResult<UseFlyoutWidthParams, string>;

  it('should return 0 if no sections are showns', () => {
    const initialProps: UseFlyoutWidthParams = {
      windowWidth: 500,
      showRight: false,
      showLeft: false,
      defaultRightSectionWidth: 0,
      defaultLeftSectionWidth: 0,
      collapsedResizedWidth: undefined,
      expandedResizedWidth: undefined,
    };
    hookResult = renderHook((props: UseFlyoutWidthParams) => useFlyoutWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual('0%');
  });

  it('should return percentage calculated from defaultRightSectionWidth', () => {
    const initialProps: UseFlyoutWidthParams = {
      windowWidth: 500,
      showRight: true,
      showLeft: false,
      defaultRightSectionWidth: 100,
      defaultLeftSectionWidth: 200,
      collapsedResizedWidth: undefined,
      expandedResizedWidth: undefined,
    };
    hookResult = renderHook((props: UseFlyoutWidthParams) => useFlyoutWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual('20%');
  });

  it('should return percentage calculated from defaultRightSectionWidth and defaultLeftSectionWidth', () => {
    const initialProps: UseFlyoutWidthParams = {
      windowWidth: 1000,
      showRight: true,
      showLeft: true,
      defaultRightSectionWidth: 200,
      defaultLeftSectionWidth: 300,
      collapsedResizedWidth: undefined,
      expandedResizedWidth: undefined,
    };
    hookResult = renderHook((props: UseFlyoutWidthParams) => useFlyoutWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual('50%');
  });

  it('should return percentage calculated from collapsedResizedWidth', () => {
    const initialProps: UseFlyoutWidthParams = {
      windowWidth: 1000,
      showRight: true,
      showLeft: false,
      defaultRightSectionWidth: 500,
      defaultLeftSectionWidth: 500,
      collapsedResizedWidth: 200,
      expandedResizedWidth: undefined,
    };
    hookResult = renderHook((props: UseFlyoutWidthParams) => useFlyoutWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual('20%');
  });

  it('should return percentage calculated from expandedResizedWidth', () => {
    const initialProps: UseFlyoutWidthParams = {
      windowWidth: 1000,
      showRight: true,
      showLeft: true,
      defaultRightSectionWidth: 500,
      defaultLeftSectionWidth: 500,
      collapsedResizedWidth: undefined,
      expandedResizedWidth: 800,
    };
    hookResult = renderHook((props: UseFlyoutWidthParams) => useFlyoutWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual('80%');
  });
});
