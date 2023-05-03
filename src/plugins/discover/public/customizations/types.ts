/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DiscoverStateContainer } from '../application/main/services/discover_state';
import type { DiscoverCustomizationService } from './customization_service';

export interface CustomizationCallbackContext {
  customizations: DiscoverCustomizationService;
  stateContainer: DiscoverStateContainer;
}

export type CustomizationCallback = (
  options: CustomizationCallbackContext
) => void | (() => void) | Promise<void | (() => void)>;
