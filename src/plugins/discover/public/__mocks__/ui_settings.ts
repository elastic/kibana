/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import {
  CONTEXT_DEFAULT_SIZE_SETTING,
  DEFAULT_COLUMNS_SETTING,
  DOC_TABLE_LEGACY,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../common';

export const uiSettingsMock = ({
  get: (key: string) => {
    if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === DOC_TABLE_LEGACY) {
      return true;
    } else if (key === SEARCH_FIELDS_FROM_SOURCE) {
      return false;
    } else if (key === CONTEXT_DEFAULT_SIZE_SETTING) {
      return 5;
    }
  },
} as unknown) as IUiSettingsClient;
