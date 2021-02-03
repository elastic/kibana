/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createRequestEncryptor } from '@elastic/request-crypto';
import { telemetryJWKS } from './telemetry_jwks';

export function getKID(useProdKey = false): string {
  return useProdKey ? 'kibana' : 'kibana_dev';
}

export async function encryptTelemetry(
  payload: any,
  { useProdKey = false } = {}
): Promise<string[]> {
  const kid = getKID(useProdKey);
  const encryptor = await createRequestEncryptor(telemetryJWKS);
  const clusters = [].concat(payload);
  return Promise.all(clusters.map((cluster: any) => encryptor.encrypt(kid, cluster)));
}
