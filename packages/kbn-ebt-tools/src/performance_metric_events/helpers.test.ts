/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAnalytics, type AnalyticsClient } from '@kbn/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import { registerPerformanceMetricEventType, reportPerformanceMetricEvent } from './helpers';
import { METRIC_EVENT_SCHEMA } from './schema';

describe('performance metric event helpers', () => {
  let analyticsClient: AnalyticsClient;

  describe('registerPerformanceMetricEventType', () => {
    beforeEach(() => {
      analyticsClient = createAnalytics({
        isDev: true, // Explicitly setting `true` to ensure we have event validation to make sure the events sent pass our validation.
        sendTo: 'staging',
        logger: loggerMock.create(),
      });
    });

    test('registers the `performance_metric` eventType to the analytics client', () => {
      const registerEventTypeSpy = jest.spyOn(analyticsClient, 'registerEventType');

      expect(() => registerPerformanceMetricEventType(analyticsClient)).not.toThrow();

      expect(registerEventTypeSpy).toHaveBeenCalledWith({
        eventType: 'performance_metric',
        schema: METRIC_EVENT_SCHEMA,
      });
    });
  });

  describe('reportPerformanceMetricEvent', () => {
    beforeEach(() => {
      analyticsClient = createAnalytics({
        isDev: true, // Explicitly setting `true` to ensure we have event validation to make sure the events sent pass our validation.
        sendTo: 'staging',
        logger: loggerMock.create(),
      });
      registerPerformanceMetricEventType(analyticsClient);
    });

    test('reports the minimum allowed event', () => {
      reportPerformanceMetricEvent(analyticsClient, { eventName: 'test-event', duration: 1000 });
    });

    test('reports all the allowed fields in the event', () => {
      reportPerformanceMetricEvent(analyticsClient, {
        eventName: 'test-event',
        meta: { my: { custom: { fields: 'here' } }, another_field: true, status: 'something' },
        duration: 10,
        key1: 'something',
        value1: 10,
        key2: 'something',
        value2: 10,
        key3: 'something',
        value3: 10,
        key4: 'something',
        value4: 10,
        key5: 'something',
        value5: 10,
      });
    });

    test('should fail if eventName and duration is missing', () => {
      expect(() =>
        reportPerformanceMetricEvent(
          analyticsClient,
          // @ts-expect-error
          {}
        )
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"Event Type 'performance_metric'\\":
        	- [eventName]: {\\"expected\\":\\"string\\",\\"actual\\":\\"undefined\\",\\"value\\":\\"undefined\\"}
        	- [duration]: {\\"expected\\":\\"number\\",\\"actual\\":\\"undefined\\",\\"value\\":\\"undefined\\"}"
      `);
    });

    test('should fail if any additional unknown keys are added', () => {
      expect(() =>
        reportPerformanceMetricEvent(analyticsClient, {
          eventName: 'test-event',
          duration: 1000,
          // @ts-expect-error
          an_unknown_field: 'blah',
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"Event Type 'performance_metric'\\":
        	- []: excess key 'an_unknown_field' found"
      `);
    });
  });
});
