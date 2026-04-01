/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useRef, useLayoutEffect } from 'react';
import type { UnmountCallback } from '@kbn/core-mount-utils-browser';
import { useCurrentActionMenu } from './chrome_hooks';

/**
 * Renders the currently mounted header action menu set via {@link ChromeStart.setHeaderActionMenu}.
 * @deprecated Use {@link HeaderAppMenu} instead. See kibana-team#2651.
 */
export const HeaderActionMenu: FC = () => {
  const mount = useCurrentActionMenu();
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<UnmountCallback | null>(null);

  useLayoutEffect(() => {
    if (mount && elementRef.current) {
      try {
        unmountRef.current = mount(elementRef.current);
      } catch (e) {
        // TODO: use client-side logger when feature is implemented
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
    return () => {
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };
  }, [mount]);

  return <div data-test-subj="headerAppActionMenu" ref={elementRef} />;
};
