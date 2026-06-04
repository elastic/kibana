/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

// KibanaRole requires both `base` and `feature` in kibana entries, and `cluster`
// in elasticsearch (use empty arrays/objects when those privileges are not needed).
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // Kibana base:all, no ES cluster privileges.
  // Sees the Stack Management nav link; data section shows only Kibana-feature links.
  kibana_admin: {
    elasticsearch: { cluster: [] },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },

  // dashboard:read only — no management privileges.
  // Stack Management nav link must NOT appear.
  global_dashboard_read: {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { dashboard: ['read'] }, spaces: ['*'] }],
  },

  // dashboard:read + cluster: manage_transform. Sees transform in the data section.
  dashboard_read_and_transform_user: {
    elasticsearch: { cluster: ['manage_transform'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: manage_ilm. Sees index_lifecycle_management in the data section.
  dashboard_read_and_manage_ilm: {
    elasticsearch: { cluster: ['manage_ilm'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: manage, manage_ccr. Sees cross_cluster_replication and related data links.
  dashboard_read_and_ccr_user: {
    elasticsearch: { cluster: ['manage', 'manage_ccr'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: manage. Sees license_management in the stack section.
  // cluster:manage also surfaces ingest and remote_clusters, so this role covers those tests too.
  dashboard_read_and_license_management: {
    elasticsearch: { cluster: ['manage'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: manage_logstash_pipelines. Sees pipelines in the ingest section.
  dashboard_read_and_logstash: {
    elasticsearch: { cluster: ['manage_logstash_pipelines'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: manage_security. Sees the full security section.
  dashboard_read_and_manage_security: {
    elasticsearch: { cluster: ['manage_security'] },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },

  // dashboard:read + cluster: monitor, manage_index_templates, manage_enrich + indices:all.
  // Sees index_management in the data section.
  dashboard_read_and_index_management: {
    elasticsearch: {
      cluster: ['monitor', 'manage_index_templates', 'manage_enrich'],
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },
};
