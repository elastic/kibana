/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { interfaces } from 'inversify';
import type { CoreDiServiceSetup, CoreDiServiceStart } from './contracts';

/**
 * The service identifier for the global service references.
 */
export const Global = Symbol.for('Global') as interfaces.ServiceIdentifier<
  interfaces.ServiceIdentifier<unknown>
>;

export const DiSetupService = Symbol.for(
  'DiSetupService'
) as interfaces.ServiceIdentifier<CoreDiServiceSetup>;

export const DiService = Symbol.for(
  'DiService'
) as interfaces.ServiceIdentifier<CoreDiServiceStart>;
