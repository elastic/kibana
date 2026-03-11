/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { log, timerange } from '@kbn/synthtrace-client';
import path from 'path';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const { dashboard, savedObjects } = getPageObjects(['dashboard', 'savedObjects']);

  const start = moment().subtract(30, 'minutes').valueOf();
  const end = moment().add(30, 'minutes').valueOf();

  const spaceId = 'default';
  const importFileName = 'log_stream_dashboard_saved_object.ndjson';
  const importFilePath = path.join(__dirname, 'exports', importFileName);

  describe('dashboards with log stream embeddable', () => {
    let synthEsLogsClient: LogsSynthtraceEsClient;
    before(async () => {
      const { logsEsClient } = synthtrace.getClients(['logsEsClient']);

      synthEsLogsClient = logsEsClient;

      await synthEsLogsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(5)
          .generator((timestamp: number, index: number) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset('synth.discover')
              .namespace('default')
              .logLevel('info')
              .defaults({
                'service.name': 'synth-discover',
              })
          ),
      ]);

      await savedObjects.importIntoSpace(importFilePath, spaceId);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await synthEsLogsClient.clean();
    });

    it('should load the old log stream but with saved search embeddable', async () => {
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();

      // Load saved dashboard with log stream embeddable
      await dashboard.loadSavedDashboard('Logs stream dashboard test with Saves Search Embeddable');
      await dashboard.waitForRenderComplete();

      // Expect things from saved search embeddable to load
      await testSubjects.existOrFail('unifiedDataTableToolbar');
      await testSubjects.existOrFail('dataGridHeader');
    });
  });
}
