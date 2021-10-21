/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import createCache from '@emotion/cache';
import { cache } from '@emotion/css';
import { serializeStyles } from '@emotion/serialize';

const TRUNCATE_GRADIENT_HEIGHT = 15;
const globalThemeCache = createCache({ key: 'truncation' });

const buildStylesheet = (maxHeight: number) => {
  return `
    .truncate-by-height {
      overflow: hidden;
      max-height: ${maxHeight > 0 ? `${maxHeight}px !important` : 'none'};
      display: inline-block;
    }
    .truncate-by-height:before {
      top: ${
        maxHeight > 0 ? maxHeight - TRUNCATE_GRADIENT_HEIGHT : TRUNCATE_GRADIENT_HEIGHT * -1
      }px;
    }
  `;
};

const flushThemedGlobals = () => {
  globalThemeCache.sheet.flush();
  globalThemeCache.inserted = {};
  globalThemeCache.registered = {};
};

export const injectTruncateStyles = (maxHeight: number) => {
  if (maxHeight === 0) {
    flushThemedGlobals();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized = serializeStyles(buildStylesheet(maxHeight) as any, cache.registered);
  if (!globalThemeCache.inserted[serialized.name]) {
    globalThemeCache.insert('', serialized, globalThemeCache.sheet, true);
  }
};
