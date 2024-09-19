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

export interface DiscoverEBTContextForProfilesProps {
  dscProfiles: string[];
}
export type DiscoverEBTContextForProfiles = BehaviorSubject<DiscoverEBTContextForProfilesProps>;

export class DiscoverEBTContextManager {
  private isEnabled: boolean = false;
  private profilesContext$: DiscoverEBTContextForProfiles | undefined; // Discover Context Awareness Profiles

  constructor() {}

  // https://docs.elastic.dev/telemetry/collection/event-based-telemetry
  public register({ core }: { core: CoreSetup }) {
    const profilesContext$ = new BehaviorSubject<DiscoverEBTContextForProfilesProps>({
      dscProfiles: [],
    });

    core.analytics.registerContextProvider({
      name: 'dsc_profiles',
      context$: profilesContext$,
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
      },
    });

    this.profilesContext$ = profilesContext$;

    // If we decide to extend EBT context with more properties, we can do it here
  }

  public enable() {
    this.isEnabled = true;
  }

  public updateProfilesContextWith(dscProfiles: DiscoverEBTContextForProfilesProps['dscProfiles']) {
    if (
      this.isEnabled &&
      this.profilesContext$ &&
      !isEqual(this.profilesContext$.getValue().dscProfiles, dscProfiles)
    ) {
      this.profilesContext$.next({
        dscProfiles,
      });
    }
  }

  public getProfilesContext() {
    return this.profilesContext$?.getValue()?.dscProfiles;
  }

  public reset() {
    this.updateProfilesContextWith([]);
    this.isEnabled = false;
  }
}
