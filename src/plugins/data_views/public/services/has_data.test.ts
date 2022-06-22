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
  it('should return true for hasESData when indices exist', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() =>
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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasESData();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(true);
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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasESData();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(false);
  });

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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(true);
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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(false);
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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasUserDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(false);
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
    const hasDataService = hasData.start(coreStart);
    const reponse = hasDataService.hasUserDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await reponse).toBe(true);
  });
});
