/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { coreWorkerFixtures } from './core_fixtures';

export interface ProfilingFixture {
  profilingSetup: {
    setupResources: () => Promise<void>;
    loadData: () => Promise<void>;
    checkStatus: () => Promise<{ has_setup: boolean; has_data: boolean }>;
  };
}

const useProfilingSetup = async (
  { esClient, kbnUrl, log }: { esClient: any; kbnUrl: any; log: any },
  use: (profilingSetup: ProfilingFixture['profilingSetup']) => Promise<void>
) => {
  const kibanaUrlWithAuth = `http://elastic:changeme@localhost:5620`;
  const esNode = `http://elastic:changeme@localhost:9220`;
  const DEFAULT_HEADERS = {
    'kbn-xsrf': true,
    'x-elastic-internal-origin': 'Kibana',
  };

  const profilingSetup = {
    async checkStatus() {
      try {
        const response = await axios.get(`${kibanaUrlWithAuth}/api/profiling/setup/es_resources`, {
          headers: DEFAULT_HEADERS,
        });
        return response.data;
      } catch (error) {
        log.error('Error checking profiling status:', error);
        return { has_setup: false, has_data: false };
      }
    },

    async setupResources() {
      try {
        log.debug('Setting up Universal profiling resources...');
        await axios.post(
          `${kibanaUrlWithAuth}/api/profiling/setup/es_resources`,
          {},
          { headers: DEFAULT_HEADERS }
        );
        log.debug('Profiling resources set up successfully');
      } catch (error) {
        log.error('Error setting up profiling resources:', error);
        throw error;
      }
    },

    async loadData() {
      try {
        log.debug('Loading Universal profiling data...');

        // Find the profiling data file
        const profilingDataPath = path.join(
          process.cwd(),
          'x-pack/solutions/observability/test/profiling_cypress/es_archivers/profiling_data_anonymized.json'
        );

        if (!fs.existsSync(profilingDataPath)) {
          log.debug('Profiling data file not found, skipping data loading');
          return;
        }

        const profilingData = fs.readFileSync(profilingDataPath, 'utf8');
        const operations = profilingData.split('\n').filter((line) => line.trim());

        // Bulk index the data
        const response = await axios.post(`${esNode}/_bulk`, operations.join('\n') + '\n', {
          headers: {
            'Content-Type': 'application/x-ndjson',
          },
          params: {
            refresh: 'wait_for',
            timeout: '1m',
          },
        });

        if (response.data.errors) {
          log.error(
            'Some errors occurred during bulk indexing:',
            response.data.items.filter((item: any) => item?.index?.error)
          );
        } else {
          log.debug(`Successfully indexed ${response.data.items.length} profiling documents`);
        }
      } catch (error) {
        log.error('Error loading profiling data:', error);
        throw error;
      }
    },
  };

  await use(profilingSetup);
};

export const profilingFixture = coreWorkerFixtures.extend<{}, ProfilingFixture>({
  profilingSetup: [
    async ({ esClient, kbnUrl, log }, use) => {
      await useProfilingSetup({ esClient, kbnUrl, log }, use);
    },
    { scope: 'worker' },
  ],
});
