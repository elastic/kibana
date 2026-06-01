/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

interface AppMenuProps {
  config?: AppMenuConfig;
}

export const RegisterAppMenu = ({ config }: AppMenuProps) => {
  const chrome = useChromeService();

  useEffect(() => {
    chrome.setAppMenu(config);

    return () => {
      chrome.setAppMenu();
    };
  }, [config, chrome]);

  return null;
};
