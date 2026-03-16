/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useRef, useLayoutEffect, useState } from 'react';
import type { MountPoint, UnmountCallback } from '@kbn/core-mount-utils-browser';
import { useChromeComponentsDeps } from '../context';

const useHeaderActionMenuMounter = () => {
  const { application } = useChromeComponentsDeps();
  const actionMenu$ = application.currentActionMenu$;
  const [mounter, setMounter] = useState<{ mount: MountPoint | undefined }>({ mount: undefined });
  useLayoutEffect(() => {
    const s = actionMenu$.subscribe((value) => {
      setMounter({ mount: value });
    });
    return () => s.unsubscribe();
  }, [actionMenu$]);
  return mounter;
};

/**
 * Renders the currently mounted header action menu set via {@link ChromeStart.setHeaderActionMenu}.
 * @deprecated Use {@link HeaderAppMenu} instead. See kibana-team#2651.
 */
export const HeaderActionMenu: FC = () => {
  const mounter = useHeaderActionMenuMounter();
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<UnmountCallback | null>(null);

  useLayoutEffect(() => {
    if (mounter.mount && elementRef.current) {
      try {
        unmountRef.current = mounter.mount(elementRef.current);
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
  }, [mounter]);

  return <div data-test-subj="headerAppActionMenu" ref={elementRef} />;
};
