/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderConfig } from '@kbn/core-chrome-browser';

export const useChromeAppHeaderRegistration = (config: AppHeaderConfig) => {
  const chrome = useChromeService();
  const unregisterRef = useRef<(() => void) | undefined>(undefined);
  const isActive = chrome.next.isEnabled && chrome.getChromeStyle() === 'project';

  useLayoutEffect(() => {
    unregisterRef.current?.();
    unregisterRef.current = undefined;

    if (!isActive) {
      return;
    }

    const unregister = chrome.next.appHeader.set(config);
    unregisterRef.current = unregister;

    return () => {
      if (unregisterRef.current === unregister) {
        unregisterRef.current = undefined;
      }
      unregister();
    };
  }, [chrome, config, isActive]);
};

export const ChromeAppHeaderRegistration = React.memo<AppHeaderConfig>((props) => {
  const { title, back, tabs, badges, menu, favorite, metadata, spacing } = props;

  const config = useMemo(
    () => ({ title, back, tabs, badges, menu, favorite, metadata, spacing }),
    [title, back, tabs, badges, menu, favorite, metadata, spacing]
  );

  useChromeAppHeaderRegistration(config);

  return null;
});

ChromeAppHeaderRegistration.displayName = 'ChromeAppHeaderRegistration';
