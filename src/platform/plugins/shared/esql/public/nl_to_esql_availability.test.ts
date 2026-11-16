/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createNlToEsqlAvailability } from './nl_to_esql_availability';

describe('createNlToEsqlAvailability', () => {
  const setup = () => {
    const { http } = coreMock.createStart();
    const getLicense = jest.fn();
    return { http, getLicense, ...createNlToEsqlAvailability(getLicense, http) };
  };

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
  ])('resolves hasInferenceConnector when %s', async (_, response, expected) => {
    const { http, hasInferenceConnector } = setup();
    (http.get as jest.Mock).mockImplementation(response);

    expect(await hasInferenceConnector()).toBe(expected);
  });

  it('requests the license and the connectors only once', async () => {
    const { http, getLicense, hasEnterpriseLicense, hasInferenceConnector } = setup();
    getLicense.mockResolvedValue({ status: 'active', hasAtLeast: () => true });
    (http.get as jest.Mock).mockResolvedValue({ connectors: [{ id: 'c1' }] });

    await Promise.all([hasEnterpriseLicense(), hasEnterpriseLicense()]);
    await Promise.all([hasInferenceConnector(), hasInferenceConnector()]);

    expect(getLicense).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
