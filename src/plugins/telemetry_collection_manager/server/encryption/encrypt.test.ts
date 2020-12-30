/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
