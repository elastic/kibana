/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createRequestEncryptor, mockEncrypt } from './encrypt.test.mocks';
import { telemetryJWKS } from './telemetry_jwks';
import { encryptTelemetry, getKID } from './encrypt';

describe('getKID', () => {
  it(`returns 'kibana_dev' kid for development`, async () => {
    const useProdKey = false;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana_dev');
  });

  it(`returns 'kibana_prod' kid for development`, async () => {
    const useProdKey = true;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana');
  });
});

describe('encryptTelemetry', () => {
  afterEach(() => {
    mockEncrypt.mockReset();
  });

  it('encrypts payload', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: true });
    expect(createRequestEncryptor).toBeCalledWith(telemetryJWKS);
  });

  it('uses kibana kid on { useProdKey: true }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: true });
    expect(mockEncrypt).toBeCalledWith('kibana', payload);
  });

  it('uses kibana_dev kid on { useProdKey: false }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: false });
    expect(mockEncrypt).toBeCalledWith('kibana_dev', payload);
  });
});
