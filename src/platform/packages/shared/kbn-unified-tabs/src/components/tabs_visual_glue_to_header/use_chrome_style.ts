/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { TabsServices } from '../../types';

export const useChromeStyle = (services: TabsServices) => {
  const chrome = services.core?.chrome;

  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);

  useEffect(() => {
    if (!chrome) {
      return;
    }

    const subscription = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => subscription.unsubscribe();
  }, [chrome]);

  return {
    isProjectChromeStyle: chromeStyle === 'project',
  };
};
