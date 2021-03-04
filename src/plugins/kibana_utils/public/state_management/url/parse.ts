/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse as _parseUrl } from 'url';
import { History } from 'history';

export const parseUrl = (url: string) => _parseUrl(url, true);
export const parseUrlHash = (url: string) => {
  const hash = parseUrl(url).hash;
  return hash ? parseUrl(hash.slice(1)) : null;
};
export const getCurrentUrl = (history: History) => history.createHref(history.location);
