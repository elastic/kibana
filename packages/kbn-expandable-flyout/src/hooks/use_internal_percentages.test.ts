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
import { useInternalPercentages } from './use_internal_percentages';
import {
  UseInternalPercentagesParams,
  UseInternalPercentagesResult,
} from './use_internal_percentages';
import { useExpandableFlyoutContext } from '../context';
import { localStorageMock } from '../../__mocks__';

jest.mock('../context');

describe('useInternalPercentages', () => {
  let hookResult: RenderHookResult<UseInternalPercentagesParams, UseInternalPercentagesResult>;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  it('should return the value in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem(
      'expandableFlyout.leftRightResizedWidths.flyout',
      JSON.stringify({ left: 50, right: 50 })
    );

    const initialProps: UseInternalPercentagesParams = {
      defaultRightSectionWidth: 350,
      defaultLeftSectionWidth: 700,
    };
    hookResult = renderHook(
      (props: UseInternalPercentagesParams) => useInternalPercentages(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current.percentages).toEqual({ left: 50, right: 50 });
  });

  it('should return values calculated from defaults if nothing in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const initialProps: UseInternalPercentagesParams = {
      defaultRightSectionWidth: 200,
      defaultLeftSectionWidth: 800,
    };
    hookResult = renderHook(
      (props: UseInternalPercentagesParams) => useInternalPercentages(props),
      {
        initialProps,
      }
    );

    expect(hookResult.result.current.percentages).toEqual({ left: 80, right: 20 });
  });

  it('should set values in localStorage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const initialProps: UseInternalPercentagesParams = {
      defaultRightSectionWidth: 350,
      defaultLeftSectionWidth: 700,
    };
    hookResult = renderHook(
      (props: UseInternalPercentagesParams) => useInternalPercentages(props),
      {
        initialProps,
      }
    );

    hookResult.result.current.setPercentages({ left: 30, right: 70 });
    expect(localStorage.getItem('expandableFlyout.leftRightResizedWidths.flyout')).toEqual(
      JSON.stringify({ left: 30, right: 70 })
    );
  });

  it('should reset values and delete localStorage entry', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem(
      'expandableFlyout.leftRightResizedWidths.flyout',
      JSON.stringify({ left: 50, right: 50 })
    );

    const initialProps: UseInternalPercentagesParams = {
      defaultRightSectionWidth: 350,
      defaultLeftSectionWidth: 700,
    };
    hookResult = renderHook(
      (props: UseInternalPercentagesParams) => useInternalPercentages(props),
      {
        initialProps,
      }
    );

    hookResult.result.current.resetPercentages();
    expect(localStorage.getItem('expandableFlyout.leftRightResizedWidths.flyout')).toEqual(null);
  });
});
