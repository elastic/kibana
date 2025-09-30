/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import {
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import type { CsvPagingStrategy } from '@kbn/reporting-common/types';
import type { JobParamsCSV, TaskPayloadCSV } from '@kbn/reporting-export-types-csv-common';
import { CSV_JOB_TYPE, CSV_REPORT_TYPE } from '@kbn/reporting-export-types-csv-common';
import type {
  BaseExportTypeSetupDeps,
  BaseExportTypeStartDeps,
  RunTaskOpts,
} from '@kbn/reporting-server';
import { ExportType, getFieldFormats } from '@kbn/reporting-server';

type CsvSearchSourceExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceExportTypeStartDeps extends BaseExportTypeStartDeps {
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
  fleet?: FleetStartContract;
}

export class CsvSearchSourceExportType extends ExportType<
  JobParamsCSV,
  TaskPayloadCSV,
  CsvSearchSourceExportTypeSetupDeps,
  CsvSearchSourceExportTypeStartDeps
> {
  id = CSV_REPORT_TYPE;
  name = CSV_JOB_TYPE;
  jobType = CSV_JOB_TYPE;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('csv-searchsource-export');
  }

  public createJob = async (jobParams: JobParamsCSV) => {
    const pagingStrategy = this.config.csv.scroll.strategy as CsvPagingStrategy;
    return { pagingStrategy, ...jobParams };
  };

  public runTask = async ({
    jobId,
    payload: job,
    taskInstanceFields,
    request,
    cancellationToken,
    stream,
  }: RunTaskOpts<TaskPayloadCSV>) => {
    const logger = this.logger.get(`execute-job:${jobId}`);

    const { csv: csvConfig } = this.config;

    const uiSettings = await this.getUiSettingsClient(request, logger);
    const dataPluginStart = this.startDeps.data;
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    // Check if this is a Fleet agent export - use system privileges for Fleet data
    const isFleetAgentExport =
      job.title === 'Agent List' &&
      (typeof job.searchSource.index === 'string'
        ? false
        : job.searchSource.index?.title === '.fleet-agents');

    logger.info(
      `CSV Export Debug: title="${job.title}", index="${
        typeof job.searchSource.index === 'string'
          ? job.searchSource.index
          : job.searchSource.index?.title
      }", isFleetAgentExport=${isFleetAgentExport}`
    );

    if (isFleetAgentExport) {
      logger.info('Using system privileges for Fleet agent export');

      // Use Fleet AgentService if available for proper authorization and data access
      if (this.startDeps.fleet) {
        logger.info('Fleet plugin available - using AgentService for Fleet agent export');
        try {
          const agentService = this.startDeps.fleet.agentService.asScoped(request);

          // Get Fleet agents using proper permissions and internal user access
          const agentResult = await agentService.listAgents({
            page: 1,
            perPage: 10000, // TODO: Handle pagination properly
            showInactive: true,
            showAgentless: true,
          });

          logger.info(
            `Fleet AgentService returned ${agentResult.agents.length} agents (total: ${agentResult.total})`
          );

          // Transform Fleet agent data to CSV format
          const fleetAgentData = agentResult.agents.map((agent) => ({
            agent_id: agent.id,
            status: agent.status,
            policy_id: agent.policy_id,
            enrolled_at: agent.enrolled_at,
            last_checkin: agent.last_checkin,
            tags: agent.tags?.join(', ') || '',
            version: agent.agent?.version || '',
            local_metadata: JSON.stringify(agent.local_metadata || {}),
          }));

          logger.info(`Transformed ${fleetAgentData.length} Fleet agents for CSV export`);

          // Create CSV content directly from Fleet data
          const csvHeaders = [
            'agent_id',
            'status',
            'policy_id',
            'enrolled_at',
            'last_checkin',
            'tags',
            'version',
            'local_metadata',
          ];
          const csvRows = fleetAgentData.map((agent) =>
            csvHeaders.map((header) => (agent as any)[header] || '')
          );
          const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(',')).join('\n');

          logger.info(`Generated CSV content with ${csvRows.length} rows`);
          logger.info(`CSV content preview (first 200 chars): ${csvContent.substring(0, 200)}`);
          logger.info(`CSV content length: ${csvContent.length}`);

          // Write Fleet CSV content directly to the stream
          stream.write(csvContent);
          stream.end();

          return {
            content_type: 'text/csv',
            csv_contains_formulas: false,
            max_size_reached: false,
            warnings: [],
          };
        } catch (error) {
          logger.error(`Fleet AgentService error: ${error.message}`);
          logger.info('Falling back to internal user search strategy');
        }
      } else {
        logger.info('Fleet plugin not available - falling back to internal user search strategy');
      }
    } else {
      logger.info('Using user privileges for regular export');
    }

    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(request),
      es: this.startDeps.esClient.asScoped(request),
    };
    const dependencies = {
      searchSourceStart,
      fieldFormatsRegistry,
    };

    const csv = new CsvGenerator(
      job,
      csvConfig,
      taskInstanceFields,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
}
