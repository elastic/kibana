/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequestEncryptor, mockEncrypt } from './encrypt.test.mocks';
import { telemetryJWKS } from './telemetry_jwks';
import { encryptTelemetry, getKID } from './encrypt';

describe('getKID', () => {
  it(`returns 'kibana_dev' kid for development`, async () => {
    const useProdKey = false;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana_dev1');
  });

  it(`returns 'kibana_1' kid for production`, async () => {
    const useProdKey = true;
    const kid = getKID(useProdKey);
    expect(kid).toBe('kibana1');
  });

  it(`should fallback to development`, async () => {
    const kid = getKID();
    expect(kid).toBe('kibana_dev1');
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

  it('uses kibana1 kid on { useProdKey: true }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: true });
    expect(mockEncrypt).toBeCalledWith('kibana1', payload);
  });

  it('uses kibana_dev1 kid on { useProdKey: false }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, { useProdKey: false });
    expect(mockEncrypt).toBeCalledWith('kibana_dev1', payload);
  });

  it('should fallback to { useProdKey: false }', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload);
    expect(mockEncrypt).toBeCalledWith('kibana_dev1', payload);
  });
});
