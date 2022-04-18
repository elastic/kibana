/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { FieldFormatInstanceType, FieldFormatsRegistry } from '../common';

export interface FieldFormatsSetup {
  /**
   * Register a server side field formatter
   * @param fieldFormat {@link FieldFormatInstanceType}
   */
  register: (fieldFormat: FieldFormatInstanceType) => void;
}

export interface FieldFormatsStart {
  /**
   * Create a field format registry
   * @param uiSettings - {@link IUiSettingsClient}
   */
  fieldFormatServiceFactory: (uiSettings: IUiSettingsClient) => Promise<FieldFormatsRegistry>;
}
