/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { apiTest, tags } from '../../../../../src/playwright';
import { createAlertRuleParams } from '../../../fixtures/constants';
import { expect } from '../../../../../api';

apiTest.describe(
  `Alerting Rules helpers`,
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let ruleId: string;
    const alertName = `index_threshold_rule_${randomUUID()}`;
    const ruleTypeId = '.index-threshold';
    const updatedAlertName = `updated_rule_${randomUUID()}`;

    apiTest.beforeEach(async ({ apiServices }) => {
      const createdResponse = await apiServices.alerting.rules.create({
        ruleTypeId,
        name: alertName,
        consumer: 'alerts',
        schedule: { interval: '1m' },
        enabled: false,
        actions: [],
        params: createAlertRuleParams,
        tags: ['test'],
      });
      expect(createdResponse).toHaveStatusCode(200);
      expect(createdResponse.data.enabled).toBe(false);
      ruleId = createdResponse.data.id;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.alerting.rules.delete(ruleId);
      const fetchedResponse = await apiServices.alerting.rules.get(ruleId, undefined, {
        ignoreErrors: [404],
      });
      expect(fetchedResponse).toHaveStatusCode(404);
      ruleId = '';
    });

    apiTest(`should fetch alert with 'alerting.rules.get'`, async ({ apiServices }) => {
      const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
      expect(fetchedResponse).toHaveStatusCode(200);
      expect(fetchedResponse.data.enabled).toBe(false);
      expect(fetchedResponse.data.name).toBe(alertName);
      expect(fetchedResponse.data.rule_type_id).toBe(ruleTypeId);
    });

    apiTest(`should update alert with 'alerting.rules.update'`, async ({ apiServices }) => {
      const updatedResponse = await apiServices.alerting.rules.update(ruleId, {
        name: updatedAlertName,
      });
      expect(updatedResponse).toHaveStatusCode(200);
      expect(updatedResponse.data.name).toBe(updatedAlertName);
    });

    apiTest('should enable/disable rule', async ({ apiServices }) => {
      await apiTest.step(`with 'alerting.rules.enable'`, async () => {
        await apiServices.alerting.rules.enable(ruleId);
        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.enabled).toBe(true);
      });

      await apiTest.step(`with 'alerting.rules.disable'`, async () => {
        await apiServices.alerting.rules.disable(ruleId);
        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.enabled).toBe(false);
      });
    });

    apiTest(`should find rule with 'alerting.rules.find'`, async ({ apiServices }) => {
      const foundResponse = await apiServices.alerting.rules.find({
        search: alertName,
        search_fields: ['name'],
        per_page: 10,
        page: 1,
      });
      expect(foundResponse).toHaveStatusCode(200);
      const match = foundResponse.data.data.find((obj: any) => obj.name === alertName);
      expect(match).toBeDefined();
      expect(match?.id).toBe(ruleId);
    });

    apiTest(`should mute/unmute rule`, async ({ apiServices }) => {
      await apiTest.step('alerting.rules.muteAll', async () => {
        await apiServices.alerting.rules.muteAll(ruleId);

        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.mute_all).toBe(true);
      });

      await apiTest.step('alerting.rules.unmuteAll', async () => {
        await apiServices.alerting.rules.unmuteAll(ruleId);

        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.mute_all).toBe(false);
      });
    });

    apiTest(`should mute/unmute alert for rule`, async ({ apiServices }) => {
      await apiTest.step('alerting.rules.muteAlert', async () => {
        const mockAlertId = 'test-alert-instance-id';
        await apiServices.alerting.rules.muteAlert(ruleId, mockAlertId);

        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.muted_alert_ids).toContain(mockAlertId);
      });

      await apiTest.step('alerting.rules.unmuteAlert', async () => {
        const mockAlertId = 'test-alert-instance-id';
        await apiServices.alerting.rules.unmuteAlert(ruleId, mockAlertId);

        const fetchedResponse = await apiServices.alerting.rules.get(ruleId);
        expect(fetchedResponse).toHaveStatusCode(200);
        expect(fetchedResponse.data.muted_alert_ids).not.toContain(mockAlertId);
      });
    });

    apiTest(`should snooze/unsnooze rule`, async ({ apiServices }) => {
      await apiTest.step('alerting.rules.snooze', async () => {
        const durationMs = 3600000;
        const snoozeResponse = await apiServices.alerting.rules.snooze(ruleId, durationMs);
        expect(snoozeResponse).toHaveStatusCode(204);
      });

      await apiTest.step('alerting.rules.unsnooze', async () => {
        const beforeUnsnooze = await apiServices.alerting.rules.get(ruleId);
        const scheduleIds =
          beforeUnsnooze.data.snooze_schedule?.map((schedule: any) => schedule.id) || [];

        const unsnoozeResponse = await apiServices.alerting.rules.unsnooze(ruleId, scheduleIds);
        expect(unsnoozeResponse).toHaveStatusCode(204);
      });
    });
  }
);
