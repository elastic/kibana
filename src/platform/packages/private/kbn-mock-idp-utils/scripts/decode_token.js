#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { crc32 } = require('zlib');

/* eslint-disable no-console */

/**
 * Removes the ESSU dev identifier prefix from a string.
 */
function removePrefixEssuDev(prefixed) {
  const prefix = 'essu_dev_';
  if (!prefixed.startsWith(prefix)) {
    throw new Error(`String does not start with expected prefix: ${prefix}`);
  }
  return prefixed.slice(prefix.length);
}

/**
 * Decodes a string that was encoded with checksum.
 */
function decode(encoded) {
  const LONG_BYTES = 8;

  // Decode from base64
  const byteBuffer = Buffer.from(encoded, 'base64');

  if (byteBuffer.length < LONG_BYTES) {
    throw new Error('Invalid encoded string: too short');
  }

  // Extract the original bytes and checksum
  const dataLength = byteBuffer.length - LONG_BYTES;
  const originalBytes = byteBuffer.subarray(0, dataLength);
  const storedCrc = byteBuffer.readBigUInt64BE(dataLength);

  // Calculate checksum of original bytes
  const calculatedCrc = crc32(originalBytes);

  // Verify checksum
  const storedCrcAsNumber = Number(storedCrc);
  if (calculatedCrc !== storedCrcAsNumber) {
    throw new Error('Invalid checksum: data may be corrupted');
  }

  // Return original string
  return originalBytes.toString('utf-8');
}

// Main script
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node decode_token.js <encoded-token>');
  console.error('');
  console.error('Example:');
  console.error('  node decode_token.js "essu_dev_abc123..."');
  process.exit(1);
}

const encodedToken = args[0];

try {
  // Step 1: Remove the prefix
  const withoutPrefix = removePrefixEssuDev(encodedToken);

  // Step 2: Decode the checksum-encoded string
  const jwt = decode(withoutPrefix);

  console.log('Decoded JWT:');
  console.log(jwt);
  console.log('');

  // Parse and pretty-print the JWT parts
  const parts = jwt.split('.');
  if (parts.length === 3) {
    console.log('JWT Parts:');
    console.log('----------');

    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      console.log('Header:');
      console.log(JSON.stringify(header, null, 2));
      console.log('');
    } catch (e) {
      console.log('Header (raw):', parts[0]);
      console.log('');
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      console.log('Payload:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('');
    } catch (e) {
      console.log('Payload (raw):', parts[1]);
      console.log('');
    }

    console.log('Signature:', parts[2]);
  }
} catch (error) {
  console.error('Error decoding token:', error instanceof Error ? error.message : error);
  process.exit(1);
}
