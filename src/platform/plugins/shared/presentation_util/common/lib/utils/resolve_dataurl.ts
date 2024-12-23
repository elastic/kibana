/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { isValidUrl } from './url';
import { missingImage } from './missing_asset';

/*
 * NOTE: args.dataurl can come as an expression here.
 * For example:
 *   [{"type":"expression","chain":[{"type":"function","function":"asset","arguments":{"_":["..."]}}]}]
 */
export const resolveFromArgs = (args: any, defaultDataurl: string | null = null): string => {
  const dataurl = get(args, 'dataurl.0', null);
  return isValidUrl(dataurl) ? dataurl : defaultDataurl;
};

export const resolveWithMissingImage = (
  img: string | null,
  alt: string | null = null
): string | null => {
  if (img !== null && isValidUrl(img)) {
    return img;
  }
  if (img === null) {
    return alt;
  }
  return missingImage;
};
