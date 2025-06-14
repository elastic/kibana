/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { ReportManager, METRIC_TYPE, UiCounterMetricType, Report } from '@kbn/analytics';
import { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

const APP_NAME = 'myApp';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  const createUiCounterEvent = (eventName: string, type: UiCounterMetricType, count = 1) => ({
    eventName,
    appName: APP_NAME,
    type,
    count,
  });

  const fetchUsageCountersObjects = async (): Promise<UsageCountersSavedObject[]> => {
    const {
      body: { saved_objects: savedObjects },
    } = await supertest
      .get('/api/saved_objects/_find?type=usage-counter')
      .set('kbn-xsrf', 'kibana')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(200);

    return savedObjects;
  };

  const sendReport = async (report: Report): Promise<void> => {
    await supertest
      .post('/api/ui_counters/_report')
      .set('kbn-xsrf', 'kibana')
      .set('content-type', 'application/json')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send({ report })
      .expect(200);
  };

  const getCounter = (
    savedObjects: UsageCountersSavedObject[],
    eventName: string,
    counterType: UiCounterMetricType
  ): UsageCountersSavedObject[] => {
    const matchingEventName = savedObjects.filter(
      ({ attributes: { domainId, counterName } }) =>
        domainId === APP_NAME && counterName === eventName
    );
    if (!matchingEventName.length) {
      throw new Error(
        `Unable to find savedObject with Event Name ${eventName}, got ${JSON.stringify(
          savedObjects
        )}`
      );
    }

    const matchingCounterType = matchingEventName.filter(
      ({ attributes }) => attributes.counterType === counterType
    );
    if (!matchingCounterType.length) {
      throw new Error(
        `Unable to find savedObject with matching Counter type ${counterType}, got ${JSON.stringify(
          savedObjects
        )}`
      );
    }

    return matchingCounterType;
  };

  describe('UI Counters API', () => {
    beforeEach(async () => await esArchiver.emptyKibanaIndex());

    it('stores ui counter events in usage counters savedObjects', async () => {
      const reportManager = new ReportManager();
      const eventName = 'my_event';
      const counterEvent = createUiCounterEvent(eventName, METRIC_TYPE.COUNT);

      const { report } = reportManager.assignReports([counterEvent]);

      await sendReport(report);
      await retry.waitForWithTimeout('reported events to be stored into ES', 8000, async () => {
        const savedObjects = await fetchUsageCountersObjects();

        const countTypeEvents = getCounter(savedObjects, eventName, METRIC_TYPE.COUNT);

        expect(countTypeEvents.length).to.eql(1);
        expect(countTypeEvents[0].attributes.count).to.eql(1);
        return true;
      });
    });

    it('supports multiple events', async () => {
      const reportManager = new ReportManager();
      const hrTime = process.hrtime();
      const nano = hrTime[0] * 1000000000 + hrTime[1];
      const firstUniqueEventName = `my_event_${nano}`;
      const secondUniqueEventName = `my_event_${nano}_2`;
      const { report } = reportManager.assignReports([
        createUiCounterEvent(firstUniqueEventName, METRIC_TYPE.COUNT),
        createUiCounterEvent(secondUniqueEventName, METRIC_TYPE.COUNT),
        createUiCounterEvent(firstUniqueEventName, METRIC_TYPE.CLICK, 2),
      ]);

      await sendReport(report);
      await retry.waitForWithTimeout('reported events to be stored into ES', 8000, async () => {
        const savedObjects = await fetchUsageCountersObjects();
        const firstEventWithCountTypeEvents = getCounter(
          savedObjects,
          firstUniqueEventName,
          METRIC_TYPE.COUNT
        );
        expect(firstEventWithCountTypeEvents.length).to.eql(1);
        expect(firstEventWithCountTypeEvents[0].attributes.count).to.eql(1);

        const firstEventWithClickTypeEvents = getCounter(
          savedObjects,
          firstUniqueEventName,
          METRIC_TYPE.CLICK
        );
        expect(firstEventWithClickTypeEvents.length).to.eql(1);
        expect(firstEventWithClickTypeEvents[0].attributes.count).to.eql(2);

        const secondEventWithCountTypeEvents = getCounter(
          savedObjects,
          secondUniqueEventName,
          METRIC_TYPE.COUNT
        );
        expect(secondEventWithCountTypeEvents.length).to.eql(1);
        expect(secondEventWithCountTypeEvents[0].attributes.count).to.eql(1);
        return true;
      });
    });
  });
}
