/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

/**
 * Mock of the portion of the {@link IUiSettingsClient} used as a parameter in the {@link getFieldDefinitions} function.
 */
export const uiSettingsClientMock: Pick<IUiSettingsClient, 'isCustom' | 'isOverridden'> = {
  isCustom: () => false,
  isOverridden: () => false,
};
