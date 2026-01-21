/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment/moment';
import { log, timerange, infra } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient, InfraSynthtraceEsClient } from '@kbn/synthtrace';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const synthtrace = getService('synthtrace');

  const start = moment().subtract(30, 'minutes').valueOf();
  const end = moment().add(30, 'minutes').valueOf();

  describe('extension getRecommendedFields', () => {
    let synthEsLogsClient: LogsSynthtraceEsClient;
    let synthEsMetricsClient: InfraSynthtraceEsClient;

    before(async () => {
      const { logsEsClient, infraEsClient } = synthtrace.getClients([
        'logsEsClient',
        'infraEsClient',
      ]);
      synthEsLogsClient = logsEsClient;
      synthEsMetricsClient = infraEsClient;

      // Index logs data for positive test
      await synthEsLogsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(5)
          .generator((timestamp: number) =>
            log
              .create()
              .message('Test log message for recommended fields')
              .timestamp(timestamp)
              .dataset('synth.recommended')
              .namespace('default')
              .logLevel('info')
              .defaults({
                'event.dataset': 'synth.recommended',
                'log.level': 'info',
              })
          ),
      ]);

      // Index metrics data for negative test
      await synthEsMetricsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp: number) => [
            infra.host('synth-metrics-host-01').cpu().timestamp(timestamp),
            infra.host('synth-metrics-host-01').memory().timestamp(timestamp),
            infra.host('synth-metrics-host-01').network().timestamp(timestamp),
          ]),
      ]);
    });

    after(async () => {
      await synthEsLogsClient.clean();
      await synthEsMetricsClient.clean();
    });

    it('should show recommended fields section for logs profile', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await dataViews.switchToAndValidate('All logs');

      // Verify recommended fields section exists
      await testSubjects.existOrFail('fieldListGroupedRecommendedFields');

      // Expand the recommended fields accordion if it's collapsed
      const accordionElement = await testSubjects.find('fieldListGroupedRecommendedFields');
      const isExpanded = (await accordionElement.getAttribute('aria-expanded')) === 'true';
      if (!isExpanded) {
        await testSubjects.click('fieldListGroupedRecommendedFields');
      }

      // Verify specific recommended fields from logs profile are present
      await testSubjects.existOrFail('field-event.dataset');
      await testSubjects.existOrFail('field-host.name');
      await testSubjects.existOrFail('field-message');
      await testSubjects.existOrFail('field-log.level');
      // host.name might not be present in synthetic data
      await testSubjects.missingOrFail('field-service.name');
    });

    it('should not show recommended fields for non-logs profile', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // Create metrics data view for negative test
      await dataViews.createFromSearchBar({
        name: 'metrics-system',
        adHoc: true,
        hasTimeField: true,
      });

      // Verify recommended fields section does not exist for non-matching profiles
      await testSubjects.missingOrFail('fieldListGroupedRecommendedFields');
    });
  });
}
