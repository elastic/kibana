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
import { IUiSettingsClient } from 'kibana/public';
import { TRUNCATE_MAX_HEIGHT } from '../../../common';

const TRUNCATE_GRADIENT_HEIGHT = 15;
const globalThemeCache = createCache({ key: 'truncation' });

export function injectTruncateStyles(uiSettings: IUiSettingsClient) {
  const maxHeight = uiSettings.get(TRUNCATE_MAX_HEIGHT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const truncateStyles: any = `
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

  const serialized = serializeStyles(truncateStyles, cache.registered);

  if (!globalThemeCache.inserted[serialized.name]) {
    globalThemeCache.insert('', serialized, globalThemeCache.sheet, true);
  }
}
