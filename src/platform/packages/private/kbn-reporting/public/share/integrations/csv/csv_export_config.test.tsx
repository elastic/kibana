/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import crypto from 'crypto';
import { getCsvReportParams } from './csv_export_config';

describe('csv export config', () => {
  describe('getCsvReportParams', () => {
    it('should return report params that use absolute time, when useAbsoluteTime is true', () => {
      const reportParams = getCsvReportParams({
        sharingData: {
          isTextBased: true,
          locatorParams: [
            {
              id: crypto.randomUUID(),
              version: 'test',
              params: {
                timeRange: {
                  from: 'now-90d/d',
                  to: 'now',
                },
              },
            },
          ],
          getSearchSource: () => ({}),
          columns: [],
          absoluteTimeRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-01T00:00:00.000Z',
          },
          title: 'test',
        },
        useAbsoluteTime: true,
      });

      expect(reportParams).toEqual(
        expect.objectContaining({
          locatorParams: expect.arrayContaining([
            expect.objectContaining({
              params: expect.objectContaining({
                timeRange: {
                  from: '2021-01-01T00:00:00.000Z',
                  to: '2021-01-01T00:00:00.000Z',
                },
              }),
            }),
          ]),
        })
      );
    });
  });
});
