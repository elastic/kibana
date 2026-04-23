/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

export const getGlobalAdvancedSettingsAllRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['all'],
        globalSettings: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

export const getGlobalAdvancedSettingsReadRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
        globalSettings: ['show'],
      },
      spaces: ['*'],
    },
  ],
});

export const getNoAdvancedSettingsPrivilegesRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
});
