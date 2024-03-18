/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  enabled: offeringBasedSchema({
    // guided_onboarding is disabled in serverless; refer to the serverless.yml file as the source of truth
    // We take this approach in order to have a central place (serverless.yml) to view disabled plugins across Kibana
    serverless: schema.boolean({ defaultValue: true }),
  }),
});

export type GuidedOnboardingConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<GuidedOnboardingConfig> = {
  schema: configSchema,
};
