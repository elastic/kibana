/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import { SAMPLE_SIZE_SETTING } from '../../common';

export const uiSettingsMock = ({
  get: (key: string) => {
    if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    }
  },
} as unknown) as IUiSettingsClient;
