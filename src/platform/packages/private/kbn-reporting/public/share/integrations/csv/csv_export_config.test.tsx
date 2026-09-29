/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';
import crypto from 'crypto';
import { NEVER } from 'rxjs';

vi.mock('../../shared/get_search_csv_job_params', () => {
      const mocked = {
      getSearchCsvJobParams: vi.fn(() => ({
        reportType: 'csv_v2',
        decoratedJobParams: {},
      })),
    };
      return { ...mocked, default: mocked };
    });

import { getSearchCsvJobParams } from '../../shared/get_search_csv_job_params';
import { getCsvReportParams, getShareMenuItems } from './csv_export_config';
import type { ReportingCSVSharingData } from '../../../types';

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

    const makeClassicSharingData = () => {
      const getSearchSource = vi.fn(
        (_args: { addGlobalTimeFilter?: boolean; absoluteTime?: boolean }) => ({})
      ) as MockedFunction<ReportingCSVSharingData['getSearchSource']>;
      const sharingData: ReportingCSVSharingData = {
        isTextBased: false,
        locatorParams: [],
        getSearchSource,
        columns: [],
        title: 'test',
        absoluteTimeRange: undefined,
      };
      return { sharingData, getSearchSource };
    };

    it('classic path: uses absolute filter when useAbsoluteTime is true (immediate export)', () => {
      const { sharingData, getSearchSource } = makeClassicSharingData();
      getCsvReportParams({ sharingData, useAbsoluteTime: true });

      expect(getSearchSource).toHaveBeenCalledWith(expect.objectContaining({ absoluteTime: true }));
    });

    it('classic path: uses relative filter when useAbsoluteTime is omitted (scheduled export)', () => {
      const { sharingData, getSearchSource } = makeClassicSharingData();
      // no useAbsoluteTime — this is how schedule creation calls getCsvReportParams
      getCsvReportParams({ sharingData });

      expect(getSearchSource).toHaveBeenCalledWith(
        expect.objectContaining({ absoluteTime: false })
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
          getSearchSource: vi.fn(),
          columns: [],
          absoluteTimeRange,
          title: 'test',
        };

        const apiClient = {
          createReportingShareJob: vi.fn(() => new Promise(() => {})),
          getManagementLink: vi.fn(),
          getReportingPublicJobPath: vi.fn(),
          getDecoratedJobParams: vi.fn((params) => params),
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

        (getSearchCsvJobParams as Mock).mockClear();

        // attempt to generate the asset export
        void shareMenu.generateAssetExport({
          intl: { formatMessage: vi.fn() },
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
