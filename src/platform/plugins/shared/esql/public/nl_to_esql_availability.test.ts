/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  createNlToEsqlAvailability,
  INFERENCE_CONNECTORS_CACHE_MS,
} from './nl_to_esql_availability';

describe('createNlToEsqlAvailability', () => {
  const setup = () => {
    const { http } = coreMock.createStart();
    const getLicense = jest.fn();
    return { http, getLicense, ...createNlToEsqlAvailability(getLicense, http) };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['an active Enterprise license', { status: 'active', hasAtLeast: () => true }, true],
    ['a lower license', { status: 'active', hasAtLeast: () => false }, false],
    ['no license', undefined, false],
  ])('resolves hasEnterpriseLicense with %s', async (_, license, expected) => {
    const { getLicense, hasEnterpriseLicense } = setup();
    getLicense.mockResolvedValue(license);

    expect(await hasEnterpriseLicense()).toBe(expected);
  });

  it.each([
    ['some connectors exist', () => Promise.resolve({ connectors: [{ id: 'c1' }] }), true],
    ['no connectors exist', () => Promise.resolve({ connectors: [] }), false],
    ['the request fails', () => Promise.reject(new Error('network error')), false],
    ['the response is unexpected', () => Promise.resolve({}), false],
  ])('resolves hasInferenceConnector when %s', async (_, response, expected) => {
    const { http, hasInferenceConnector } = setup();
    (http.get as jest.Mock).mockImplementation(response);

    expect(await hasInferenceConnector()).toBe(expected);
  });

  it('retries the connectors lookup after a failure', async () => {
    const { http, hasInferenceConnector } = setup();
    (http.get as jest.Mock)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ connectors: [{ id: 'c1' }] });

    expect(await hasInferenceConnector()).toBe(false);
    expect(await hasInferenceConnector()).toBe(true);
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('requests the license only once', async () => {
    const { getLicense, hasEnterpriseLicense } = setup();
    getLicense.mockResolvedValue({ status: 'active', hasAtLeast: () => true });

    await Promise.all([hasEnterpriseLicense(), hasEnterpriseLicense()]);
    await hasEnterpriseLicense();

    expect(getLicense).toHaveBeenCalledTimes(1);
  });

  it('shares a pending lookup even when it outlives the cache lifetime', async () => {
    const { http, hasInferenceConnector } = setup();
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    const response = Promise.withResolvers<{ connectors: unknown[] }>();
    (http.get as jest.Mock).mockReturnValue(response.promise);

    const first = hasInferenceConnector();
    now.mockReturnValue(INFERENCE_CONNECTORS_CACHE_MS + 1);
    const second = hasInferenceConnector();
    response.resolve({ connectors: [{ id: 'c1' }] });

    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('looks the connectors up again when none were found', async () => {
    const { http, hasInferenceConnector } = setup();
    (http.get as jest.Mock)
      .mockResolvedValueOnce({ connectors: [] })
      .mockResolvedValueOnce({ connectors: [{ id: 'c1' }] });

    expect(await hasInferenceConnector()).toBe(false);
    expect(await hasInferenceConnector()).toBe(true);
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('reuses a lookup that found connectors for a minute', async () => {
    const { http, hasInferenceConnector } = setup();
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    (http.get as jest.Mock)
      .mockResolvedValueOnce({ connectors: [{ id: 'c1' }] })
      .mockResolvedValueOnce({ connectors: [] });

    expect(await hasInferenceConnector()).toBe(true);
    now.mockReturnValue(INFERENCE_CONNECTORS_CACHE_MS - 1);
    expect(await hasInferenceConnector()).toBe(true);
    expect(http.get).toHaveBeenCalledTimes(1);

    now.mockReturnValue(INFERENCE_CONNECTORS_CACHE_MS);
    expect(await hasInferenceConnector()).toBe(false);
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
