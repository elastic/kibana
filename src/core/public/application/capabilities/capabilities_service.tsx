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

import { deepFreeze, RecursiveReadonly } from '../../utils/deep_freeze';
import { MixedApp } from '../application_service';
import { mergeCapabilities } from './merge_capabilities';
import { InjectedMetadataStart } from '../../injected_metadata';
import { BasePathStart } from '../../base_path';

interface StartDeps {
  apps: ReadonlyArray<MixedApp>;
  basePath: BasePathStart;
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
  public async start({ apps, basePath, injectedMetadata }: StartDeps): Promise<CapabilitiesStart> {
    const mergedCapabilities = mergeCapabilities(
      // Custom capabilites for new platform apps
      ...apps.filter(app => app.capabilities).map(app => app.capabilities!),
      // Generate navLink capabilities for all apps
      ...apps.map(app => ({ navLinks: { [app.id]: true } }))
    );

    // NOTE: should replace `fetch` with browser HTTP service once it exists
    const res = await fetch(basePath.addToPath('/api/capabilities'), {
      method: 'POST',
      body: JSON.stringify({ capabilities: mergedCapabilities }),
      headers: {
        'kbn-xsrf': 'xxx',
      },
      credentials: 'same-origin',
    });

    if (res.status === 401) {
      return {
        availableApps: [],
        capabilities: deepFreeze({
          navLinks: {},
          management: {},
          catalogue: {},
        }),
      };
    } else if (res.status !== 200) {
      throw new Error(`Capabilities check failed.`);
    }

    const body = await res.json();
    const capabilities = deepFreeze(body.capabilities as Capabilities);
    const availableApps = apps.filter(app => capabilities.navLinks[app.id]);

    return {
      availableApps,
      capabilities,
    };
  }
}
