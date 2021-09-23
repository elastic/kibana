/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';

export const setVersion = (history: Pick<History, 'location' | 'replace'>, version: string) => {
  const search = new URLSearchParams(history.location.search);
  if (search.get('_v') === version) return;
  search.set('_v', version);
  const path =
    history.location.pathname +
    '?' +
    search.toString() +
    (history.location.hash ? '#' + history.location.hash : '');
  history.replace(path);
};
