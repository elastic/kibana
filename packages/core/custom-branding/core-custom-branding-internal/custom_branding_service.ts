/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomBranding } from "@kbn/core-custom-branding";

/**
 * Combined parts of custom branding
 * Properties are each optional to provide flexibility for the Kibana
 * operator
 */

/** @internal */
export class CustomBrandingService {
  private customBrandingPerOperator: {};

  async start(customBrandingObject): Promise<CustomBranding> {
    return {
      get: (custombrandingObject) => {
        customBrandingObject.map((property) => {
          
        })
        return this.customBrandingPerOperator,
      },
      set: (customBrandingObject: CustomBranding) => {
        this.customBrandingPerOperator.add(customBrandingObject.next(customBrandingObject));
      },
    };
  }
  async stop() {

  }
}
