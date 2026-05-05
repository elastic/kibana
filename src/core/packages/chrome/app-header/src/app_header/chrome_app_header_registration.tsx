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
    if (!isActive) {
      return;
    }

    return () => {
      unregisterRef.current?.();
      unregisterRef.current = undefined;
    };
  }, [isActive]);

  useLayoutEffect(() => {
    if (!isActive) {
      unregisterRef.current?.();
      unregisterRef.current = undefined;
      return;
    }

    unregisterRef.current = chrome.next.appHeader.set(config);
  }, [chrome, config, isActive]);
};

export const ChromeAppHeaderRegistration = React.memo<AppHeaderConfig>((props) => {
  const { title, back, tabs, badges, menu, onShare, favorite } = props;

  const config = useMemo(
    () => ({ title, back, tabs, badges, menu, onShare, favorite }),
    [title, back, tabs, badges, menu, onShare, favorite]
  );

  useChromeAppHeaderRegistration(config);

  return null;
});

ChromeAppHeaderRegistration.displayName = 'ChromeAppHeaderRegistration';
