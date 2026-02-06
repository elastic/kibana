/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { crc32 } from 'zlib';

/**
 * Encodes a string by appending a CRC32 checksum and base64 encoding the result.
 *
 * @param toEncode - The string to encode
 * @returns Base64 encoded string with CRC32 checksum appended
 *
 * @example
 * const encoded = encode("my-string");
 * // Returns a base64 string with the CRC32 checksum appended
 */
export function encodeWithChecksum(toEncode: string): string {
  const LONG_BYTES = 8; // Java long is 8 bytes

  // Convert string to UTF-8 bytes
  const encodedBytes = Buffer.from(toEncode, 'utf-8');

  // Calculate CRC32 checksum
  const crcValue = crc32(encodedBytes);

  // Create a buffer with space for the original bytes + 8 bytes for the long
  const byteBuffer = Buffer.allocUnsafe(encodedBytes.length + LONG_BYTES);

  // Copy the original bytes
  encodedBytes.copy(byteBuffer, 0);

  // Append the CRC32 value as a 64-bit big-endian long (to match Java's putLong)
  // Java's CRC32.getValue() returns a long, which is stored as big-endian
  byteBuffer.writeBigUInt64BE(BigInt(crcValue), encodedBytes.length);

  // Encode to base64
  return byteBuffer.toString('base64');
}

/**
 * Decodes a string that was encoded with the encodeWithChecksum() method.
 * Verifies the CRC32 checksum and returns the original string.
 *
 * @param encoded - The base64 encoded string with CRC32 checksum
 * @returns The original decoded string
 * @throws Error if the checksum is invalid
 *
 * @example
 * const original = decode(encoded);
 */
export function decodeWithChecksum(encoded: string): string {
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
  if (BigInt(calculatedCrc) !== storedCrc) {
    throw new Error('Invalid checksum: data may be corrupted');
  }

  // Return original string
  return originalBytes.toString('utf-8');
}
