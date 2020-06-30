/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { RecursiveReadonly } from '@kbn/utility-types';

import { Capabilities } from '../../../types/capabilities';
import { deepFreeze } from '../../../utils';
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
    const capabilities = await http.post<Capabilities>('/api/core/capabilities', {
      body: JSON.stringify({ applications: appIds }),
    });

    return {
      capabilities: deepFreeze(capabilities),
    };
  }
}
