/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import crypto from 'crypto';
import { NEVER } from 'rxjs';

jest.mock('../../shared/get_search_csv_job_params', () => ({
  getSearchCsvJobParams: jest.fn(() => ({
    reportType: 'csv_v2',
    decoratedJobParams: {},
  })),
}));

import { getSearchCsvJobParams } from '../../shared/get_search_csv_job_params';
import { getCsvReportParams, getShareMenuItems } from './csv_export_config';

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

  describe('getShareMenuItems', () => {
    describe('generateReportingJobCSV', () => {
      it('invokes getSearchModeParams with useAbsoluteTime set to true', () => {
        const absoluteTimeRange = {
          from: '2021-01-01T00:00:00.000Z',
          to: '2021-01-02T00:00:00.000Z',
        };
        const sharingData = {
          isTextBased: true,
          locatorParams: [
            {
              id: crypto.randomUUID(),
              version: 'test',
              params: {
                timeRange: { from: 'now-90d/d', to: 'now' },
              },
            },
          ],
          getSearchSource: jest.fn(),
          columns: [],
          absoluteTimeRange,
          title: 'test',
        };

        const apiClient = {
          createReportingShareJob: jest.fn(() => new Promise(() => {})),
          getManagementLink: jest.fn(),
          getReportingPublicJobPath: jest.fn(),
          getDecoratedJobParams: jest.fn((params) => params),
        };

        const shareMenu = getShareMenuItems({
          apiClient,
          startServices$: NEVER,
          csvConfig: { maxRows: 0 },
          isServerless: false,
        } as unknown as Parameters<typeof getShareMenuItems>[0])({
          objectType: 'search',
          sharingData,
          shareableUrlLocatorParams: undefined,
        } as unknown as Parameters<ReturnType<typeof getShareMenuItems>>[0]);

        (getSearchCsvJobParams as jest.Mock).mockClear();

        // attempt to generate the asset export
        void shareMenu.generateAssetExport({
          intl: { formatMessage: jest.fn() },
        } as unknown as Parameters<typeof shareMenu.generateAssetExport>[0]);

        expect(getSearchCsvJobParams).toHaveBeenCalledWith(
          expect.objectContaining({
            searchModeParams: {
              isEsqlMode: true,
              locatorParams: [
                expect.objectContaining({
                  params: expect.objectContaining({
                    timeRange: absoluteTimeRange,
                  }),
                }),
              ],
            },
          })
        );
      });
    });
  });
});
