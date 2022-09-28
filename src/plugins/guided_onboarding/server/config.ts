/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

// By default, hide any guided onboarding UI. Change it with guidedOnboarding.ui:true in kibana.dev.yml
const configSchema = schema.object({
  ui: schema.boolean({ defaultValue: false }),
});

export type GuidedOnboardingConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<GuidedOnboardingConfig> = {
  // define which config properties should be available in the client side plugin
  exposeToBrowser: {
    ui: true,
  },
  schema: configSchema,
};
