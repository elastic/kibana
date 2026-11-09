/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { mountFeatureFlagsHelper } from './mount_helper';

describe('mountFeatureFlagsHelper', () => {
  test('closes an open flyout when the helper unmounts', () => {
    const close = jest.fn();
    let resolveClose = () => {};
    const overlays = {
      openFlyout: jest.fn(
        () =>
          ({
            close,
            onClose: new Promise<void>((resolve) => {
              resolveClose = resolve;
            }),
          } as OverlayRef)
      ),
    };
    let helper: ReturnType<typeof mountFeatureFlagsHelper> | undefined;

    act(() => {
      helper = mountFeatureFlagsHelper({
        http: {
          get: jest.fn(),
          post: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
        },
        overlays,
        rendering: { addContext: (node: React.ReactNode) => node as React.ReactElement },
        refreshFlags: async () => undefined,
        getBrowserEvaluations: () => [],
      });
    });

    act(() => {
      helper?.open();
    });
    expect(overlays.openFlyout).toHaveBeenCalledTimes(1);

    act(() => {
      helper?.unmount();
    });
    resolveClose();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
