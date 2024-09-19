/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';

export interface DiscoverEBTContextProps {
  dscProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

export class DiscoverEBTContextManager {
  private isEnabled: boolean = false;
  private ebtContext$: DiscoverEBTContext | undefined;

  constructor() {}

  // https://docs.elastic.dev/telemetry/collection/event-based-telemetry
  public register({ core }: { core: CoreSetup }) {
    const context$ = new BehaviorSubject<DiscoverEBTContextProps>({
      dscProfiles: [],
    });

    core.analytics.registerContextProvider({
      name: 'discover_context',
      context$,
      schema: {
        dscProfiles: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'List of profiles which are activated by Discover Context Awareness logic',
            },
          },
        },
        // If we decide to extend EBT context with more properties, we can do it here
      },
    });

    this.ebtContext$ = context$;
  }

  public enable() {
    this.isEnabled = true;
  }

  public updateProfilesContextWith(dscProfiles: DiscoverEBTContextProps['dscProfiles']) {
    if (
      this.isEnabled &&
      this.ebtContext$ &&
      !isEqual(this.ebtContext$.getValue().dscProfiles, dscProfiles)
    ) {
      this.ebtContext$.next({
        dscProfiles,
      });
    }
  }

  public getProfilesContext() {
    return this.ebtContext$?.getValue()?.dscProfiles;
  }

  public reset() {
    this.updateProfilesContextWith([]);
    this.isEnabled = false;
  }
}
