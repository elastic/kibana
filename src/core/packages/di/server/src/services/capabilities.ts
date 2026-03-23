/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import type { CapabilitiesProvider as ICapabilitiesProvider } from '@kbn/core-capabilities-server';

/**
 * Service identifier to register a capabilities provider.
 * @see {@link CapabilitiesSetup}
 * @example
 * ```ts
 * bind(CapabilitiesProvider).toConstantValue(() => {
 *   something: { read: true },
 * });
 * ```
 * @public
 */
export const CapabilitiesProvider = Symbol(
  'CapabilitiesProvider'
) as ServiceIdentifier<ICapabilitiesProvider>;
