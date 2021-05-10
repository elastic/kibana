/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '../../types/capabilities';
import { KibanaRequest } from '../http';

export type { Capabilities };

/**
 * See {@link CapabilitiesSetup}
 * @public
 */
export type CapabilitiesProvider = () => Partial<Capabilities>;

/**
 * See {@link CapabilitiesSetup}
 * @public
 */
export type CapabilitiesSwitcher = (
  request: KibanaRequest,
  uiCapabilities: Capabilities,
  useDefaultCapabilities: boolean
) => Partial<Capabilities> | Promise<Partial<Capabilities>>;
