/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

enum ParseMode {
  BEFORE_BEGIN,
  AFTER_BEGIN,
  AFTER_END,
}

const BEGIN_TOKEN = '-----BEGIN';
const END_TOKEN = '-----END';

// openssl x509 -noout -fingerprint -sha256 -inform pem -in ca.crt
export async function getFingerprint(
  cert: ArrayBuffer,
  algorithm: AlgorithmIdentifier = 'SHA-256'
) {
  // Use first certificate only
  let mode = ParseMode.BEFORE_BEGIN;
  const pemData = Array.from(new Uint8Array(cert))
    .map((char) => String.fromCharCode(char))
    .join('')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (mode === ParseMode.BEFORE_BEGIN && line.startsWith(BEGIN_TOKEN)) {
        mode = ParseMode.AFTER_BEGIN;
        return false;
      }
      if (mode === ParseMode.AFTER_BEGIN && line.startsWith(END_TOKEN)) {
        mode = ParseMode.AFTER_END;
        return false;
      }
      return mode === ParseMode.AFTER_BEGIN;
    })
    .join('');

  // Convert to DER
  const derData = atob(pemData);
  const derBuffer = new Uint8Array(new ArrayBuffer(derData.length));
  for (let i = 0; i < derData.length; i++) {
    derBuffer[i] = derData.charCodeAt(i);
  }

  // Calculate fingerprint
  const hashBuffer = await crypto.subtle.digest(algorithm, derBuffer);

  // Convert to HEX
  return Array.from(new Uint8Array(hashBuffer))
    .map((char) => char.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
}
