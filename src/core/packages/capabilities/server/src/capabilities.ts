/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';

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
) => MaybePromise<Partial<Capabilities>>;
