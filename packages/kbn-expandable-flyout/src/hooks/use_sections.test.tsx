/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, RenderHookResult } from '@testing-library/react';
import type { UseSectionsParams, UseSectionsResult } from './use_sections';
import { useSections } from './use_sections';
import { useExpandableFlyoutState } from '../..';

jest.mock('../..');

describe('useSections', () => {
  let hookResult: RenderHookResult<UseSectionsResult, UseSectionsParams>;

  it('should return undefined for all values if no registeredPanels', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      left: undefined,
      right: undefined,
      preview: undefined,
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [],
    };
    hookResult = renderHook((props: UseSectionsParams) => useSections(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual({
      leftSection: undefined,
      rightSection: undefined,
      previewSection: undefined,
      mostRecentPreviewBanner: undefined,
      mostRecentPreview: undefined,
    });
  });

  it('should return all sections', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      left: { id: 'left' },
      right: { id: 'right' },
      preview: [{ id: 'preview' }],
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [
        {
          key: 'right',
          component: () => <div>{'component'}</div>,
        },
        {
          key: 'left',
          component: () => <div>{'component'}</div>,
        },
        {
          key: 'preview',
          component: () => <div>{'component'}</div>,
        },
      ],
    };
    hookResult = renderHook((props: UseSectionsParams) => useSections(props), {
      initialProps,
    });

    expect(hookResult.result.current.rightSection?.key).toEqual('right');
    expect(hookResult.result.current.rightSection?.component).toBeDefined();

    expect(hookResult.result.current.leftSection?.key).toEqual('left');
    expect(hookResult.result.current.leftSection?.component).toBeDefined();

    expect(hookResult.result.current.previewSection?.key).toEqual('preview');
    expect(hookResult.result.current.previewSection?.component).toBeDefined();

    expect(hookResult.result.current.mostRecentPreviewBanner).toEqual(undefined);
    expect(hookResult.result.current.mostRecentPreview).toEqual({ id: 'preview' });
  });

  it('should return preview banner', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      preview: [
        {
          id: 'preview',
          params: {
            banner: {
              title: 'title',
              backgroundColor: 'primary',
              textColor: 'red',
            },
          },
        },
      ],
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [
        {
          key: 'preview',
          component: () => <div>{'component'}</div>,
        },
      ],
    };
    hookResult = renderHook((props: UseSectionsParams) => useSections(props), {
      initialProps,
    });

    expect(hookResult.result.current.mostRecentPreviewBanner).toEqual({
      title: 'title',
      backgroundColor: 'primary',
      textColor: 'red',
    });
  });

  it('should return most recent preview', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      preview: [{ id: 'preview1' }, { id: 'preview2' }, { id: 'preview3' }],
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [],
    };
    hookResult = renderHook((props: UseSectionsParams) => useSections(props), {
      initialProps,
    });

    expect(hookResult.result.current.mostRecentPreview).toEqual({ id: 'preview3' });
  });
});
