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

/**
 * The following emotion cache management was introduced here
 * https://ntsim.uk/posts/how-to-update-or-remove-global-styles-in-emotion/
 */
const TRUNCATE_GRADIENT_HEIGHT = 15;
const globalThemeCache = createCache({ key: 'truncation' });

const buildStylesheet = (maxHeight: number) => {
  if (!maxHeight) {
    return [
      `
    .dscTruncateByHeight {
      max-height: none;
    }`,
    ];
  }
  return [
    `
    .dscTruncateByHeight {
      overflow: hidden;
      max-height: ${maxHeight}px !important;
    }
    .dscTruncateByHeight:before {
      top: ${maxHeight - TRUNCATE_GRADIENT_HEIGHT}px;
    }
  `,
  ];
};

export const injectTruncateStyles = (maxHeight: number) => {
  const serialized = serializeStyles(buildStylesheet(maxHeight), cache.registered);
  if (!globalThemeCache.inserted[serialized.name]) {
    globalThemeCache.insert('', serialized, globalThemeCache.sheet, true);
  }
};
