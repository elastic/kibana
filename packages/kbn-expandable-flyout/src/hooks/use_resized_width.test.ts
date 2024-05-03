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
import { useResizedWidth } from './use_resized_width';
import { UseResizedWidthParams, UseResizedWidthResult } from './use_resized_width';
import { localStorageMock } from '../../__mocks__';
import { useExpandableFlyoutContext } from '../context';

jest.mock('../context');

describe('useResizedWidth', () => {
  let hookResult: RenderHookResult<UseResizedWidthParams, UseResizedWidthResult>;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  it('should return the collapsed value in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem('expandableFlyout.collapsedResizedWidth.flyout', '1000');

    const initialProps: UseResizedWidthParams = {
      mode: 'collapsed',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current.width).toEqual(1000);
  });

  it('should return the expanded value in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem('expandableFlyout.expandedResizedWidth.flyout', '2000');

    const initialProps: UseResizedWidthParams = {
      mode: 'expanded',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current.width).toEqual(2000);
  });

  it('should return undefined if nothing in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const initialProps: UseResizedWidthParams = {
      mode: 'expanded',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    expect(hookResult.result.current.width).toEqual(undefined);
  });

  it('should set collapsed value in localStorage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const initialProps: UseResizedWidthParams = {
      mode: 'collapsed',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    hookResult.result.current.setWidth(100);
    expect(localStorage.getItem('expandableFlyout.collapsedResizedWidth.flyout')).toEqual('100');
  });

  it('should set expanded value in localStorage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const initialProps: UseResizedWidthParams = {
      mode: 'expanded',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    hookResult.result.current.setWidth(200);
    expect(localStorage.getItem('expandableFlyout.expandedResizedWidth.flyout')).toEqual('200');
  });

  it('should reset collapsed value and delete localStorage entry', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem('expandableFlyout.collapsedResizedWidth.flyout', '1');

    const initialProps: UseResizedWidthParams = {
      mode: 'expanded',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    hookResult.result.current.resetWidth();
    expect(localStorage.getItem('expandableFlyout.undefined.flyout')).toEqual(null);
  });

  it('should reset expanded value and delete localStorage entry', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem('expandableFlyout.expandedResizedWidth.flyout', '2');

    const initialProps: UseResizedWidthParams = {
      mode: 'expanded',
    };
    hookResult = renderHook((props: UseResizedWidthParams) => useResizedWidth(props), {
      initialProps,
    });

    hookResult.result.current.resetWidth();
    expect(localStorage.getItem('expandableFlyout.expandedResizedWidth.flyout')).toEqual(null);
  });
});
