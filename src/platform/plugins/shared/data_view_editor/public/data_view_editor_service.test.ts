/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { first, firstValueFrom } from 'rxjs';
import { DataViewEditorService } from './data_view_editor_service';
import type { HttpSetup } from '@kbn/core/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

jest.mock('./lib', () => ({
  ...jest.requireActual('./lib'),
  ensureMinimumTime: (promiseOrPromises: Promise<unknown> | Array<Promise<unknown>>) =>
    Array.isArray(promiseOrPromises) ? Promise.all(promiseOrPromises) : promiseOrPromises,
}));

type DataViewsMocks = Partial<Record<keyof DataViewsServicePublic, jest.Mock>>;

const createService = (dataViewsOverrides: DataViewsMocks = {}) =>
  new DataViewEditorService({
    services: {
      http: { get: jest.fn().mockResolvedValue({}) } as unknown as HttpSetup,
      dataViews: {
        getIdsWithTitle: jest.fn().mockResolvedValue([]),
        getRollupsEnabled: jest.fn().mockReturnValue(false),
        getIndices: jest.fn().mockResolvedValue([{ name: 'tracks', item: {} }]),
        getFieldsForWildcard: jest.fn().mockResolvedValue([]),
        ...dataViewsOverrides,
      } as unknown as DataViewsServicePublic,
    },
    initialValues: {},
  });

describe('DataViewEditorService', () => {
  it('should check for rollup indices when rolls are enabled', () => {
    const get = jest.fn();
    const http = { get } as unknown as HttpSetup;
    new DataViewEditorService({
      services: {
        http,
        dataViews: {
          getIdsWithTitle: jest.fn().mockResolvedValue([]),
          getRollupsEnabled: jest.fn().mockReturnValue(true),
        } as unknown as DataViewsServicePublic,
      },
      initialValues: {},
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toEqual('/api/rollup/indices');
  });
  it('should skip check for rollup indices when rollups are disabled', () => {
    const http = { get: jest.fn() } as unknown as HttpSetup;
    new DataViewEditorService({
      services: {
        http,
        dataViews: {
          getIdsWithTitle: jest.fn().mockResolvedValue([]),
          getRollupsEnabled: jest.fn().mockReturnValue(false),
        } as unknown as DataViewsServicePublic,
      },
      initialValues: {},
    });

    expect(http.get).toHaveBeenCalledTimes(0);
  });

  describe('timestamp fields', () => {
    let service: DataViewEditorService;

    afterEach(() => service.destroy());

    it('should expose the failure when the field list request fails', async () => {
      service = createService({
        getFieldsForWildcard: jest.fn().mockRejectedValue(new Error('Fields API is unavailable')),
      });

      service.setIndexPattern('tracks*');

      const error = await firstValueFrom(
        service.timestampFieldsError$.pipe(first((value) => value !== undefined))
      );

      expect(error?.message).toBe('Fields API is unavailable');
      expect(await firstValueFrom(service.loadingTimestampFields$)).toBe(false);
    });

    it('should clear a previous failure once the field list request succeeds', async () => {
      service = createService({
        getFieldsForWildcard: jest
          .fn()
          .mockRejectedValueOnce(new Error('Fields API is unavailable'))
          .mockResolvedValue([{ name: '@timestamp', type: 'date' }]),
      });

      service.setIndexPattern('tracks*');
      await firstValueFrom(
        service.timestampFieldsError$.pipe(first((value) => value !== undefined))
      );

      service.setIndexPattern('tracks-2*');
      const options = await firstValueFrom(
        service.timestampFieldOptions$.pipe(first((value) => value.length > 0))
      );

      expect(options.map(({ fieldName }) => fieldName)).toContain('@timestamp');
      expect(await firstValueFrom(service.timestampFieldsError$)).toBeUndefined();
    });

    it('should ignore a failure of a superseded request once no indices match', async () => {
      let rejectFieldsRequest: (error: Error) => void = () => {};
      const getFieldsForWildcard = jest.fn(
        () =>
          new Promise((_resolve, reject) => {
            rejectFieldsRequest = reject;
          })
      );
      service = createService({
        getIndices: jest.fn(async ({ pattern }: { pattern: string }) =>
          pattern === '*' || pattern.startsWith('tracks') ? [{ name: 'tracks', item: {} }] : []
        ),
        getFieldsForWildcard,
      });

      service.setIndexPattern('tracks*');
      await firstValueFrom(
        service.matchedIndices$.pipe(
          first(({ exactMatchedIndices }) => exactMatchedIndices.length > 0)
        )
      );

      service.setIndexPattern('zzz');
      await firstValueFrom(
        service.matchedIndices$.pipe(
          first(({ exactMatchedIndices }) => exactMatchedIndices.length === 0)
        )
      );

      expect(getFieldsForWildcard).toHaveBeenCalledTimes(1);
      rejectFieldsRequest(new Error('Fields API is unavailable'));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(await firstValueFrom(service.timestampFieldsError$)).toBeUndefined();
    });
  });
});
