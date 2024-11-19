/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';

export const configMock = {
  get: (key: string) => {
    if (key === 'defaultIndex') {
      return 'the-data-view-id';
    } else if (key === SORT_DEFAULT_ORDER_SETTING) {
      return 'desc';
    }

    return '';
  },
} as unknown as IUiSettingsClient;
