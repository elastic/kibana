/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Persona, RoleDescriptor } from './types';

const PERSONA_PASSWORD = 'TestEAPermAudit123!';
const ROLE_PREFIX = 'ea-audit-';

const SIEM_ALL_KIBANA: RoleDescriptor['kibana'] = [
  { base: [], feature: { siem: ['all'] }, spaces: ['*'] },
];

// Index patterns (must match server-side constants)
const IDX = {
  entityStore: '.entities.*',
  entityStoreUpdates: '.entities.v1.updates.*',
  entityStoreHistory: '.entities.*history*',
  riskScore: 'risk-score.risk-score-*',
  watchlists: '.entity_analytics.watchlists.*',
  leads: '.internal.*entity-leads-*',
  assetCriticality: '.asset-criticality.asset-criticality-*',
  securitySourceIndices: [
    'logs-*',
    'metrics-*',
    '.ds-*',
    'auditbeat-*',
    'filebeat-*',
    'packetbeat-*',
    'winlogbeat-*',
    'endgame-*',
    '-*security.alerts*',
  ],
} as const;

const CLUSTER_ENTITY_STORE = [
  'manage_index_templates',
  'manage_transform',
  'manage_ingest_pipelines',
  'manage_enrich',
];

const CLUSTER_RISK_ENABLE = [
  'manage_index_templates',
  'manage_transform',
  'manage_ingest_pipelines',
];

const fullEntityStoreIndices = [
  { names: [IDX.entityStore], privileges: ['read', 'manage'] },
  { names: [IDX.entityStoreUpdates], privileges: ['read', 'manage'] },
  { names: [IDX.entityStoreHistory], privileges: ['create_index', 'manage', 'read', 'write'] },
  // Entity Store V2 check_privileges also checks the alias `entities-latest-{namespace}` and
  // `entities-updates-{namespace}` (no dot prefix). These are NOT covered by `.entities.*`.
  { names: ['entities-*'], privileges: ['read', 'write'] },
  {
    names: IDX.securitySourceIndices as unknown as string[],
    privileges: ['read', 'view_index_metadata'],
  },
];

const buildPersona = (id: string, name: string, roleDescriptor: RoleDescriptor): Persona => ({
  id,
  name,
  username: `ea-audit-${id}`,
  password: PERSONA_PASSWORD,
  roleName: `${ROLE_PREFIX}${id}`,
  roleDescriptor,
});

export const PERSONAS: Persona[] = [
  // P1: Kibana feature only — no ES index or cluster grants
  buildPersona('no_ea_access', 'No EA Access', {
    elasticsearch: { cluster: [], indices: [] },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P2: read on all EA indices, no write, no cluster privs
  buildPersona('read_all', 'Read All', {
    elasticsearch: {
      cluster: [],
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read'] },
        { names: [IDX.watchlists], privileges: ['read'] },
        { names: [IDX.leads], privileges: ['read'] },
        { names: [IDX.assetCriticality], privileges: ['read'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P3: full access — read+write on all EA indices + all cluster privs
  buildPersona('full_all', 'Full All', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P4: full_all minus entity store indices
  buildPersona('entity_store_no', 'No Entity Store', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P5: full_all, entity store: read+view_index_metadata only (no manage)
  buildPersona('entity_store_read', 'Entity Store Read Only', {
    elasticsearch: {
      cluster: [],
      indices: [
        { names: [IDX.entityStore], privileges: ['read'] },
        { names: [IDX.entityStoreUpdates], privileges: ['read'] },
        { names: [IDX.entityStoreHistory], privileges: ['read'] },
        {
          names: IDX.securitySourceIndices as unknown as string[],
          privileges: ['read', 'view_index_metadata'],
        },
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P6: full_all minus risk-score index
  buildPersona('risk_score_no', 'No Risk Score Index', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P7: full_all, risk score: read only (no write, no cluster manage)
  buildPersona('risk_score_read', 'Risk Score Read Only', {
    elasticsearch: {
      cluster: [],
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P8: full_all minus watchlists index
  buildPersona('watchlists_no', 'No Watchlists', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P9: full_all, watchlists: read only
  buildPersona('watchlists_read', 'Watchlists Read Only', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P10: full_all minus leads index
  buildPersona('leads_no', 'No Leads', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P11: full_all, leads: read only
  buildPersona('leads_read', 'Leads Read Only', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P12: full_all minus asset criticality index
  buildPersona('asset_crit_no', 'No Asset Criticality', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P13: full_all, asset criticality: read only
  buildPersona('asset_crit_read', 'Asset Criticality Read Only', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE,
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P14: full_all, cluster: no manage_transform (can't run risk engine)
  buildPersona('no_manage_transform', 'No manage_transform', {
    elasticsearch: {
      cluster: CLUSTER_ENTITY_STORE.filter((p) => p !== 'manage_transform'),
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),

  // P15: full_all, cluster: no manage_index_templates or manage_ingest_pipelines (can't enable risk engine)
  buildPersona('no_enable_cluster', 'No Enable Cluster Privs', {
    elasticsearch: {
      cluster: ['manage_transform', 'manage_enrich'],
      indices: [
        ...fullEntityStoreIndices,
        { names: [IDX.riskScore], privileges: ['read', 'write'] },
        { names: [IDX.watchlists], privileges: ['read', 'write'] },
        { names: [IDX.leads], privileges: ['read', 'write'] },
        { names: [IDX.assetCriticality], privileges: ['read', 'write'] },
      ],
    },
    kibana: SIEM_ALL_KIBANA,
  }),
];

export const createPersona = async (
  kibanaUrl: string,
  esUrl: string,
  adminAuth: string,
  persona: Persona
): Promise<void> => {
  const headers = {
    Authorization: `Basic ${adminAuth}`,
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
  };

  // Kibana API for roles (needed for Kibana feature privileges)
  const roleRes = await fetch(`${kibanaUrl}/api/security/role/${persona.roleName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(persona.roleDescriptor),
  });
  if (!roleRes.ok) {
    const body = await roleRes.text();
    throw new Error(`Failed to create role ${persona.roleName}: ${roleRes.status} ${body}`);
  }

  // ES native user API (more reliable than Kibana's /api/security/users in dev configs)
  const esHeaders = {
    Authorization: `Basic ${adminAuth}`,
    'Content-Type': 'application/json',
  };
  const userRes = await fetch(`${esUrl}/_security/user/${persona.username}`, {
    method: 'PUT',
    headers: esHeaders,
    body: JSON.stringify({
      password: persona.password,
      roles: [persona.roleName],
      full_name: persona.name,
      email: '',
    }),
  });
  if (!userRes.ok) {
    const body = await userRes.text();
    throw new Error(`Failed to create user ${persona.username}: ${userRes.status} ${body}`);
  }
};
