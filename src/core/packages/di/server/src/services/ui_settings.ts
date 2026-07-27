/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

/**
 * The uiSettings client scoped to the current HTTP request.
 * @see {@link IUiSettingsClient}
 * @public
 */
export const UiSettingsClient = Symbol('UiSettingsClient') as ServiceIdentifier<IUiSettingsClient>;

/**
 * The global uiSettings client scoped to the current HTTP request.
 * @see {@link IUiSettingsClient}
 * @public
 */
export const GlobalUiSettingsClient = Symbol(
  'GlobalUiSettingsClient'
) as ServiceIdentifier<IUiSettingsClient>;
