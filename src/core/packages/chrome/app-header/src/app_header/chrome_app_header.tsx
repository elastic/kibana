/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderConfig } from '@kbn/core-chrome-browser';

export type ChromeAppHeaderProps = AppHeaderConfig;

export const ChromeAppHeader = React.memo<ChromeAppHeaderProps>((props) => {
  const { title, back, tabs, badges, menu, onShare, favorite } = props;
  const chrome = useChromeService();

  const config = useMemo(
    () => ({ title, back, tabs, badges, menu, onShare, favorite }),
    [title, back, tabs, badges, menu, onShare, favorite]
  );

  useEffect(() => {
    if (!chrome.next.isEnabled || chrome.getChromeStyle() !== 'project') {
      return;
    }
    return chrome.next.appHeader.set(config);
  }, [chrome, config]);

  return null;
});

ChromeAppHeader.displayName = 'ChromeAppHeader';
