/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { IndicesPutIndexTemplateIndexTemplateMapping } from '@elastic/elasticsearch/lib/api/types';
import { TELEMETRY_LOCAL_EBT_INDICES } from '../../common/local_shipper';

export async function registerIndexMappings(
  getElasticsearchClient: () => Promise<ElasticsearchClient>,
  logger: Logger
) {
  try {
    const esClient = await getElasticsearchClient();

    await registerIngestPipeline(getElasticsearchClient);
    const indices = Object.entries(MAPPINGS);

    await Promise.all(
      indices.map(async ([index, template]) => {
        await esClient.indices.putIndexTemplate({
          name: index,
          index_patterns: `${index}*`,
          template,
        });
      })
    );
  } catch (err) {
    logger.error(err);
  }
}

async function registerIngestPipeline(getElasticsearchClient: () => Promise<ElasticsearchClient>) {
  const esClient = await getElasticsearchClient();
  await esClient.ingest.putPipeline({
    id: 'ebt-kibana-browser',
    processors: [
      {
        user_agent: {
          target_field: 'context.parsed_user_agent',
          field: 'context.user_agent',
          ignore_missing: true,
          ignore_failure: true,
        },
      },
    ],
    on_failure: [
      { set: { field: 'original-error', value: '{{ _ingest.on_failure_message }}' } },
      { set: { field: 'original-index', value: '{{ _index }}' } },
      { set: { field: 'original-body', value: '{{ _ingest }}' } },
      { set: { field: '_index', value: 'failed-docs' } },
    ],
  });
}

const MAPPINGS: Record<string, IndicesPutIndexTemplateIndexTemplateMapping> = {
  [TELEMETRY_LOCAL_EBT_INDICES.SERVER]: {
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        event_type: { type: 'keyword' },
        // Using "flattened" for flexibility
        properties: { type: 'flattened' },
        context: {
          properties: {
            cluster_uuid: { type: 'keyword' },
            cluster_name: { type: 'keyword' },
            cluster_version: { type: 'version' },
            cluster_build_flavor: { type: 'keyword' },
            kibana_uuid: { type: 'keyword' },
            pid: { type: 'long' },
            isDev: { type: 'boolean' },
            isDistributable: { type: 'boolean' },
            version: { type: 'version' },
            branch: { type: 'keyword' },
            buildSha: { type: 'keyword' },
            buildNum: { type: 'long' },
            overall_status_level: { type: 'keyword' },
            overall_status_summary: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
            },
            license_id: { type: 'keyword' },
            license_status: { type: 'keyword' },
            license_type: { type: 'keyword' },
            cloudId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            deploymentId: { type: 'keyword' },
            cloudTrialEndDate: { type: 'date' },
            cloudIsElasticStaffOwned: { type: 'boolean' },
            projectId: { type: 'keyword' },
            projectType: { type: 'keyword' },
            orchestratorTarget: { type: 'keyword' },
            labels: { type: 'flattened' },
          },
        },
      },
    },
  },
  [TELEMETRY_LOCAL_EBT_INDICES.BROWSER]: {
    settings: {
      default_pipeline: 'ebt-kibana-browser',
    },
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        event_type: { type: 'keyword' },
        // Using "flattened" for flexibility
        properties: { type: 'flattened' },
        context: {
          properties: {
            cluster_uuid: { type: 'keyword' },
            cluster_name: { type: 'keyword' },
            cluster_version: { type: 'version' },
            cluster_build_flavor: { type: 'keyword' },
            isDev: { type: 'boolean' },
            isDistributable: { type: 'boolean' },
            version: { type: 'version' },
            branch: { type: 'keyword' },
            buildSha: { type: 'keyword' },
            buildNum: { type: 'long' },
            session_id: { type: 'keyword' },
            user_agent: { type: 'keyword' },
            parsed_user_agent: {
              properties: {
                name: { type: 'keyword' },
                original: { type: 'keyword' },
                version: { type: 'keyword' },
                os: {
                  properties: {
                    name: { type: 'keyword' },
                    version: { type: 'version' },
                    full: { type: 'keyword' },
                  },
                },
                device: {
                  properties: {
                    name: { type: 'keyword' },
                  },
                },
              },
            },
            preferred_language: { type: 'keyword' },
            preferred_languages: { type: 'keyword' },
            viewport_width: { type: 'long' },
            viewport_height: { type: 'long' },
            page_title: { type: 'text' },
            page_url: { type: 'keyword' },
            pageName: { type: 'keyword' },
            applicationId: { type: 'keyword' },
            page: { type: 'keyword' },
            entityId: { type: 'keyword' },
            discoverProfiles: { type: 'keyword' },
            cloudId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            deploymentId: { type: 'keyword' },
            cloudTrialEndDate: { type: 'date' },
            cloudIsElasticStaffOwned: { type: 'boolean' },
            projectId: { type: 'keyword' },
            projectType: { type: 'keyword' },
            orchestratorTarget: { type: 'keyword' },
            license_id: { type: 'keyword' },
            license_status: { type: 'keyword' },
            license_type: { type: 'keyword' },
            spaceSolution: { type: 'keyword' },
            prebuiltRulesPackageVersion: { type: 'keyword' },
            userId: { type: 'keyword' },
            isElasticCloudUser: { type: 'boolean' },
            labels: { type: 'flattened' },
          },
        },
      },
    },
  },
};
