/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { DEVELOPER_TOOLBAR_ID } from '../lib/constants';

/**
 * Measures the developer toolbar height via ResizeObserver.
 * Used to offset snap-to-grid calculations so rows align with
 * the visible viewport above the toolbar.
 */
export const useToolbarHeight = (): number => {
  const [toolbarHeight, setToolbarHeight] = useState(0);

  useEffect(() => {
    const toolbar = document.getElementById(DEVELOPER_TOOLBAR_ID);
    if (!toolbar) return;

    const update = () => setToolbarHeight(toolbar.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  return toolbarHeight;
};
