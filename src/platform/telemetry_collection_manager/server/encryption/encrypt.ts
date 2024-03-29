/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRequestEncryptor } from '@elastic/request-crypto';
import { telemetryJWKS } from './telemetry_jwks';

export function getKID(useProdKey = false): string {
  return useProdKey ? 'kibana1' : 'kibana_dev1';
}

export async function encryptTelemetry<Payload = unknown>(
  payload: Payload,
  { useProdKey = false } = {}
): Promise<string> {
  const kid = getKID(useProdKey);
  const encryptor = await createRequestEncryptor(telemetryJWKS);

  return await encryptor.encrypt(kid, payload);
}
