/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';

import { Capabilities } from '../../../types/capabilities';
import { HttpStart } from '../../http';

interface StartDeps {
  appIds: string[];
  http: HttpStart;
}

/** @internal */
export interface CapabilitiesStart {
  capabilities: RecursiveReadonly<Capabilities>;
}

/**
 * Service that is responsible for UI Capabilities.
 * @internal
 */
export class CapabilitiesService {
  public async start({ appIds, http }: StartDeps): Promise<CapabilitiesStart> {
    const useDefaultCapabilities = http.anonymousPaths.isAnonymous(window.location.pathname);
    const capabilities = await http.post<Capabilities>('/api/core/capabilities', {
      query: useDefaultCapabilities ? { useDefaultCapabilities } : undefined,
      body: JSON.stringify({ applications: appIds }),
    });

    return {
      capabilities: deepFreeze(capabilities),
    };
  }
}
