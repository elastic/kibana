/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useLayoutEffect, useRef } from 'react';
import type { UnmountCallback } from '@kbn/core-mount-utils-browser';
import { useLegacyActionMenu } from './hooks/chrome';

export const LegacyHeaderActionMenu: FC = () => {
  const mount = useLegacyActionMenu();
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<UnmountCallback | null>(null);

  useLayoutEffect(() => {
    if (mount && elementRef.current) {
      try {
        unmountRef.current = mount(elementRef.current);
      } catch (e) {
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
