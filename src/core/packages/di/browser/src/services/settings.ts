/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The uiSettings client scoped to the current space.
 * @see {@link IUiSettingsClient}
 * @public
 */
export const UiSettingsClient: ServiceToken<IUiSettingsClient> = createToken('UiSettingsClient');

/**
 * The global uiSettings client.
 * @see {@link IUiSettingsClient}
 * @public
 */
export const GlobalUiSettingsClient: ServiceToken<IUiSettingsClient> =
  createToken('GlobalUiSettingsClient');
