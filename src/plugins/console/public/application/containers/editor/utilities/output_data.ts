/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expandLiteralStrings } from '../../../../shared_imports';

export const isJSONContentType = (contentType?: string) =>
  Boolean(contentType && contentType.indexOf('application/json') >= 0);

export const isMapboxVectorTile = (contentType?: string) =>
  contentType?.includes('application/vnd.mapbox-vector-tile') ?? false;

/**
 * Best effort expand literal strings
 */
export const safeExpandLiteralStrings = (data: string): string => {
  try {
    return expandLiteralStrings(data);
  } catch (e) {
    return data;
  }
};
