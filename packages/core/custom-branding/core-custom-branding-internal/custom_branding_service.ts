/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomBranding } from "@kbn/core-custom-branding";
import { BehaviorSubject } from "rxjs";

interface StartDeps {
  /** What properties should be set for this Kibana */
  customBrandingPerOperator: Map<CustomBranding, boolean>;
  /** The full functionality of custom branding that could be set */
  customBrandingObject: Partial<CustomBranding> | CustomBranding,
}

/** @internal */
export class CustomBrandingService {
  // set as async in terms of how this will be gathered and brought into core at start of the service
  async start({customBrandingObject, customBrandingPerOperator}: StartDeps): Promise<CustomBranding> {
    const customBranding$ = new BehaviorSubject<Partial<CustomBranding>>(new Map());
    return {
      get: () => {
        customBrandingObject.map((property) => {
        return customBrandingPerOperator.set(property),
        })
      },
      // observable? 
      get$: () => {
        return customBranding$
      },
      set: () => {
        return customBrandingPerOperator,
      },
    };
  }
  // Does setting the properties need to occur at the start of the service? 
  // IF NOT: 
  // public applyCustomBranding((customBrandingObject: CustomBranding)) {
  //     this.customBrandingPerOperator.add(customBrandingObject.next(customBrandingObject));
  //   },
}
