/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

export function useScreenshot() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const generateScreenshot = useCallback(async () => {
    const element = document.getElementById('kibana-body');
    if (!element) {
      return null;
    }

    try {
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
    } catch (error) {
      setScreenshot(null);
    }
  }, [setScreenshot]);

  return {
    generateScreenshot,
    screenshot,
  };
}
