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

import { deepFreeze, RecursiveReadonly } from '../../../utils';
import { MixedApp } from '../application_service';
import { InjectedMetadataStart } from '../../injected_metadata';

interface StartDeps {
  apps: ReadonlyArray<MixedApp>;
  injectedMetadata: InjectedMetadataStart;
}

/**
 * The read-only set of capabilities available for the current UI session.
 * Capabilities are simple key-value pairs of (string, boolean), where the string denotes the capability ID,
 * and the boolean is a flag indicating if the capability is enabled or disabled.
 *
 * @public
 */
export interface Capabilities {
  /** Navigation link capabilities. */
  navLinks: Record<string, boolean>;

  /** Management section capabilities. */
  management: {
    [sectionId: string]: Record<string, boolean>;
  };

  /** Catalogue capabilities. Catalogue entries drive the visibility of the Kibana homepage options. */
  catalogue: Record<string, boolean>;

  /** Custom capabilities, registered by plugins. */
  [key: string]: Record<string, boolean | Record<string, boolean>>;
}

/**
 * Capabilities Setup.
 * @public
 */
export interface CapabilitiesStart {
  /**
   * Gets the read-only capabilities.
   */
  capabilities: RecursiveReadonly<Capabilities>;

  /**
   * Apps available based on the current capabilities. Should be used
   * to show navigation links and make routing decisions.
   */
  availableApps: ReadonlyArray<MixedApp>;
}

/** @internal */

/**
 * Service that is responsible for UI Capabilities.
 */
export class CapabilitiesService {
  public async start({ apps, injectedMetadata }: StartDeps): Promise<CapabilitiesStart> {
    const capabilities = deepFreeze(injectedMetadata.getCapabilities());
    const availableApps = apps.filter(app => capabilities.navLinks[app.id]);

    return {
      availableApps,
      capabilities,
    };
  }
}
