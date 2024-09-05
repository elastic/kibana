/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { HasData } from './has_data';

describe('when calling hasData service', () => {
  describe('hasDataView', () => {
    it('should return true for hasDataView when server returns true', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest.spyOn(http, 'get').mockImplementation(() =>
        Promise.resolve({
          hasDataView: true,
          hasUserDataView: true,
        })
      );

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(true);
    });

    it('should return false for hasDataView when server returns false', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest.spyOn(http, 'get').mockImplementation(() =>
        Promise.resolve({
          hasDataView: false,
          hasUserDataView: true,
        })
      );

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(false);
    });

    it('should return true for hasDataView when server throws an error', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest
        .spyOn(http, 'get')
        .mockImplementation(() => Promise.reject(new Error('Oops')));

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(true);
    });

    it('should return false for hasUserDataView when server returns false', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest.spyOn(http, 'get').mockImplementation(() =>
        Promise.resolve({
          hasDataView: true,
          hasUserDataView: false,
        })
      );

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasUserDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(false);
    });

    it('should return true for hasUserDataView when server returns true', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest.spyOn(http, 'get').mockImplementation(() =>
        Promise.resolve({
          hasDataView: true,
          hasUserDataView: true,
        })
      );

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasUserDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(true);
    });

    it('should return true for hasUserDataView when server throws an error', async () => {
      const coreStart = coreMock.createStart();
      const http = coreStart.http;

      // Mock getIndices
      const spy = jest
        .spyOn(http, 'get')
        .mockImplementation(() => Promise.reject(new Error('Oops')));

      const hasData = new HasData();
      const hasDataService = hasData.start(coreStart, true);
      const response = hasDataService.hasUserDataView();

      expect(spy).toHaveBeenCalledTimes(1);

      expect(await response).toBe(true);
    });
  });
  describe('hasESData', () => {
    describe('resolve/cluster is available', () => {
      it('should return true for hasESData when indices exist', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        // Mock getIndices
        const spy = jest
          .spyOn(http, 'get')
          .mockImplementation(() => Promise.resolve({ hasEsData: true }));

        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, true);
        const response = hasDataService.hasESData();

        expect(spy).toHaveBeenCalledTimes(1);

        expect(await response).toBe(true);
      });

      it('should return false for hasESData when no indices exist', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        // Mock getIndices
        const spy = jest
          .spyOn(http, 'get')
          .mockImplementation(() => Promise.resolve({ hasEsData: false }));

        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, true);
        const response = hasDataService.hasESData();

        expect(spy).toHaveBeenCalledTimes(1);

        expect(await response).toBe(false);
      });
    });

    describe('resolve/cluster not available', () => {
      it('should return true for hasESData when indices exist', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        // Mock getIndices
        const spy = jest.spyOn(http, 'get').mockImplementationOnce(() =>
          Promise.resolve({
            aliases: [],
            data_streams: [],
            indices: [
              {
                aliases: [],
                attributes: ['open'],
                name: 'sample_data_logs',
              },
            ],
          })
        );

        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, false);
        const response = hasDataService.hasESData();

        expect(spy).toHaveBeenCalledTimes(1);

        expect(await response).toBe(true);
      });

      it('should return false for hasESData when no indices exist', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        // Mock getIndices
        const spy = jest.spyOn(http, 'get').mockImplementation(() =>
          Promise.resolve({
            aliases: [],
            data_streams: [],
            indices: [],
          })
        );

        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, false);
        const response = hasDataService.hasESData();

        expect(spy).toHaveBeenCalledTimes(1);

        expect(await response).toBe(false);
      });

      it('should return false for hasESData when only automatically created sources exist', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        // Mock getIndices
        const spy = jest.spyOn(http, 'get').mockImplementation((path: any) =>
          Promise.resolve({
            aliases: [],
            data_streams: path.includes('*:*')
              ? [] // return empty on remote cluster call
              : [
                  {
                    name: 'logs-enterprise_search.api-default',
                    timestamp_field: '@timestamp',
                    backing_indices: ['.ds-logs-enterprise_search.api-default-2022.03.07-000001'],
                  },
                ],
            indices: [],
          })
        );

        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, false);
        const response = hasDataService.hasESData();

        expect(spy).toHaveBeenCalledTimes(1);

        expect(await response).toBe(false);
      });

      it('should hit search api in case resolve api throws', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        const spyGetIndices = jest
          .spyOn(http, 'get')
          .mockImplementation(() => Promise.reject(new Error('oops')));

        const spySearch = jest
          .spyOn(http, 'post')
          .mockImplementation(() => Promise.resolve({ total: 10 }));
        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, false);
        const response = await hasDataService.hasESData();

        expect(response).toBe(true);

        expect(spyGetIndices).toHaveBeenCalledTimes(1);
        expect(spySearch).toHaveBeenCalledTimes(1);
      });

      it('should return false in case search api throws', async () => {
        const coreStart = coreMock.createStart();
        const http = coreStart.http;

        const spyGetIndices = jest
          .spyOn(http, 'get')
          .mockImplementation(() => Promise.reject(new Error('oops')));

        const spySearch = jest
          .spyOn(http, 'post')
          .mockImplementation(() => Promise.reject(new Error('oops')));
        const hasData = new HasData();
        const hasDataService = hasData.start(coreStart, false);
        const response = await hasDataService.hasESData();

        expect(response).toBe(true);

        expect(spyGetIndices).toHaveBeenCalledTimes(1);
        expect(spySearch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
