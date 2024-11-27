/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EUI_VIS_COLOR_STORE } from '@elastic/eui';
import { Observable } from 'rxjs';

export const euiVisColors$ = new Observable((subscriber) => {
  const storeId = EUI_VIS_COLOR_STORE.subscribe('UPDATE', () => {
    subscriber.next();
  });

  return () => {
    EUI_VIS_COLOR_STORE.unsubscribe('UPDATE', storeId);
  };
});
