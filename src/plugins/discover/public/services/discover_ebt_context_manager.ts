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
  private ebtContextForProfiles$: DiscoverEBTContextForProfiles | undefined;

  constructor() {}

  public register({ core }: { core: CoreSetup }) {
    const ebtContextForProfiles$ = new BehaviorSubject<DiscoverEBTContextForProfilesProps>({
      dscProfiles: [],
    });

    core.analytics.registerContextProvider({
      name: 'dsc_profiles',
      context$: ebtContextForProfiles$,
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

    this.ebtContextForProfiles$ = ebtContextForProfiles$;
  }

  public enable() {
    this.isEnabled = true;
  }

  public updateProfilesContextWith(dscProfiles: DiscoverEBTContextForProfilesProps['dscProfiles']) {
    if (
      this.isEnabled &&
      this.ebtContextForProfiles$ &&
      !isEqual(this.ebtContextForProfiles$.getValue().dscProfiles, dscProfiles)
    ) {
      this.ebtContextForProfiles$.next({
        dscProfiles,
      });
    }
  }

  public getProfilesContext() {
    return this.ebtContextForProfiles$?.getValue();
  }

  public reset() {
    this.updateProfilesContextWith([]);
    this.isEnabled = false;
  }
}
