/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRequestEncryptor, mockEncrypt } from './encrypt.test.mocks';
import { telemetryJWKS } from './telemetry_jwks';
import { encryptTelemetry, getKID } from './encrypt';

describe('getKID', () => {
  it(`returns 'kibana_dev_1' kid for development`, async () => {
    const useProdKey = false;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana_dev_1');
  });

  it(`returns 'kibana_1' kid for production`, async () => {
    const useProdKey = true;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana_1');
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

  it('uses kibana_1 kid on { useProdKey: true }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: true });
    expect(mockEncrypt).toBeCalledWith('kibana_1', payload);
  });

  it('uses kibana_dev_1 kid on { useProdKey: false }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: false });
    expect(mockEncrypt).toBeCalledWith('kibana_dev_1', payload);
  });
});
