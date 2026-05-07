/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { faker } from '@faker-js/faker';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  TRACES,
  RICH_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
  expectTracesExperienceEnabled,
} from '../../fixtures/traces_experience';

const APM_ALERTS_INDEX_PATTERN = '.*alerts-observability.apm.alerts-*';
const STATEFUL_APM_ALERTS_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';
const SERVERLESS_APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

const RULE_NAME = `Latency threshold ${faker.string.uuid()} ${Date.now()}`;
const RULE_TYPE_ID = 'apm.transaction_duration';

const ALERT_TIME_RANGE = {
  rangeFrom: TRACES.DEFAULT_START_TIME,
  rangeTo: TRACES.DEFAULT_END_TIME,
};

function createAlertDocument({
  alertUuid,
  ruleId,
  spaceId,
}: {
  alertUuid: string;
  ruleId: string;
  spaceId: string;
}) {
  const now = new Date().toISOString();

  return {
    '@timestamp': now,
    'kibana.alert.uuid': alertUuid,
    'kibana.alert.start': TRACES.DEFAULT_START_TIME,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.rule.name': RULE_NAME,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
    'kibana.alert.rule.category': 'Latency threshold',
    'kibana.alert.rule.consumer': 'apm',
    'kibana.alert.reason': `Avg. latency is 2,000 ms in the last 5 mins for service: ${RICH_TRACE.SERVICE_NAME}, env: production, type: request. Alert when > 1,500 ms.`,
    'kibana.alert.evaluation.threshold': 1500000,
    'kibana.alert.evaluation.value': 2000000,
    'kibana.alert.duration.us': 0,
    'kibana.alert.time_range': { gte: now },
    'kibana.alert.instance.id': '*',
    'service.name': RICH_TRACE.SERVICE_NAME,
    'service.environment': 'production',
    'transaction.type': 'request',
    'processor.event': 'transaction',
    'kibana.space_ids': [spaceId],
    'event.kind': 'signal',
    'event.action': 'open',
    tags: ['apm'],
  };
}

spaceTest.describe(
  'Traces in Discover - Explore from Alerts',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    let ruleId: string;
    let alertDocId: string;

    spaceTest.beforeAll(async ({ scoutSpace, config, apiServices, esClient }) => {
      await setupTracesExperience(scoutSpace, config);

      const response = await apiServices.alerting.rules.create(
        {
          ruleTypeId: RULE_TYPE_ID,
          name: RULE_NAME,
          consumer: 'apm',
          schedule: { interval: '1m' },
          enabled: false,
          params: {
            serviceName: RICH_TRACE.SERVICE_NAME,
            transactionType: 'request',
            environment: 'production',
            aggregationType: 'avg',
            threshold: 1500,
            windowSize: 5,
            windowUnit: 'm',
          },
          tags: ['apm'],
        },
        scoutSpace.id
      );
      ruleId = response.data.id;

      const alertUuid = faker.string.uuid();
      const alertIndex = config.serverless
        ? SERVERLESS_APM_ALERTS_INDEX
        : STATEFUL_APM_ALERTS_INDEX;

      const indexResponse = await esClient.index({
        index: alertIndex,
        op_type: 'create',
        refresh: 'wait_for',
        document: createAlertDocument({ alertUuid, ruleId, spaceId: scoutSpace.id }),
      });
      alertDocId = indexResponse._id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace, apiServices, esClient }) => {
      try {
        await esClient.deleteByQuery({
          index: APM_ALERTS_INDEX_PATTERN,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
          refresh: true,
          conflicts: 'proceed',
        });
      } catch {
        // continue cleanup
      }

      try {
        await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);
      } catch {
        // continue cleanup
      }

      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'Alert details - "Traces in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to alert details page', async () => {
          await page.gotoApp(`observability/alerts/${alertDocId}`, {
            params: ALERT_TIME_RANGE,
          });
        });

        await spaceTest.step(
          'click "Traces in Discover" from the Latency chart actions',
          async () => {
            await expect(async () => {
              const panel = page.locator('.euiPanel').filter({ hasText: 'Latency' });
              await panel.locator('[data-test-subj="apmAlertDetailsOpenActionsDropdown"]').click();
              await expect(
                page.testSubj.locator('apmAlertDetailsTracesOpenInDiscoverAction')
              ).toBeVisible();
            }).toPass({ timeout: 60_000, intervals: [2_000] });

            await page.testSubj.locator('apmAlertDetailsTracesOpenInDiscoverAction').click();
          }
        );

        await spaceTest.step('verify traces experience loads', async () => {
          await expectTracesExperienceEnabled(pageObjects);
        });
      }
    );
  }
);
