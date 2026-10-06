/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingsClientCommon } from './ui_settings_client_common';
import type { UiSettingsServiceOptions } from '../types';
/**
 * Global UiSettingsClient
 */
export declare class UiSettingsGlobalClient extends UiSettingsClientCommon {
  constructor(options: UiSettingsServiceOptions);
  setMany(
    changes: Record<string, any>,
    options?: {
      validateKeys?: boolean;
    }
  ): Promise<void>;
  set(key: string, value: any): Promise<void>;
}
