/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generator for malformed and edge-case data to test robustness.
 * Applies various corruption patterns to simulate real-world data quality issues.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { getRandomItem } from './http_field_generators';

/**
 * Types of data malformations.
 */
export enum MalformationType {
  INVALID_JSON = 'invalid_json',
  TRUNCATED = 'truncated',
  LONG_VALUES = 'long_values',
  INVALID_FIELDS = 'invalid_fields',
  SPECIAL_CHARS = 'special_chars',
  TIMESTAMP_ANOMALY = 'timestamp_anomaly',
  DUPLICATE = 'duplicate',
  NULL_REQUIRED = 'null_required',
}

/**
 * Weighted distribution for malformation types.
 * These weights determine the relative probability of each malformation type
 * being selected when a log is marked for malformation (5% overall rate).
 * The weights are relative and will be normalized during selection.
 */
export const MALFORMATION_RATES = {
  [MalformationType.INVALID_JSON]: 4, // ~30.8% of malformed logs (highest priority)
  [MalformationType.TRUNCATED]: 2, // ~15.4% of malformed logs
  [MalformationType.LONG_VALUES]: 1, // ~7.7% of malformed logs
  [MalformationType.INVALID_FIELDS]: 2, // ~15.4% of malformed logs
  [MalformationType.SPECIAL_CHARS]: 1, // ~7.7% of malformed logs
  [MalformationType.TIMESTAMP_ANOMALY]: 1, // ~7.7% of malformed logs
  [MalformationType.DUPLICATE]: 1, // ~7.7% of malformed logs
  [MalformationType.NULL_REQUIRED]: 1, // ~7.7% of malformed logs
};

/**
 * Check if a log should be malformed based on global rate (5%).
 */
export function shouldApplyMalformation(): boolean {
  return Math.random() < 0.05;
}

/**
 * Select a random malformation type based on weighted rates.
 */
export function selectMalformationType(): MalformationType {
  // Calculate total weight
  const totalWeight = Object.values(MALFORMATION_RATES).reduce((sum, rate) => sum + rate, 0);

  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;

  // Select type based on weighted probability
  for (const [type, rate] of Object.entries(MALFORMATION_RATES)) {
    random -= rate;
    if (random <= 0) {
      return type as MalformationType;
    }
  }

  // Fallback (should never reach here)
  return MalformationType.INVALID_JSON;
}

/**
 * 1. Invalid JSON - Corrupts JSON in request/response body or message field.
 */
export function applyInvalidJSON(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  // Corrupt message field
  if (corrupted.message) {
    const corruptionType = Math.floor(Math.random() * 4);
    switch (corruptionType) {
      case 0:
        // Missing closing brace
        corrupted.message = corrupted.message.replace(/}$/, '');
        break;
      case 1:
        // Unescaped quotes
        corrupted.message = corrupted.message.replace(/"([^"]+)":/g, '$1:');
        break;
      case 2:
        // Trailing comma
        corrupted.message = corrupted.message.replace(/}$/, ',}');
        break;
      case 3:
        // Invalid characters
        corrupted.message = corrupted.message + '\x00\x01\x02';
        break;
    }
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'InvalidJSONError';
  corrupted['error.message'] = 'Invalid JSON structure detected';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 2. Truncated messages - Simulates network issues or buffer overflows.
 */
export function applyTruncation(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  if (corrupted.message && corrupted.message.length > 50) {
    // Truncate at random point (50-90% of original length)
    const truncateAt = Math.floor(corrupted.message.length * (0.5 + Math.random() * 0.4));
    corrupted.message = corrupted.message.substring(0, truncateAt) + '...TRUNCATED';
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'TruncatedDataError';
  corrupted['error.message'] = 'Message truncated unexpectedly';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 3. Extremely long values - Tests field length limits.
 */
export function applyLongValues(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  // Generate extremely long string (10KB - 100KB)
  const longStringLength = Math.floor(Math.random() * 90000) + 10000;
  const longString = 'A'.repeat(longStringLength);

  // Apply to random field
  const targetField = getRandomItem([
    'url.path',
    'user_agent.name',
    'http.request.referrer',
    'message',
  ]);

  switch (targetField) {
    case 'url.path':
      corrupted['url.path'] = '/' + longString;
      break;
    case 'user_agent.name':
      corrupted['user_agent.name'] = longString;
      break;
    case 'http.request.referrer':
      corrupted['http.request.referrer'] = 'https://' + longString;
      break;
    case 'message':
      corrupted.message = longString;
      break;
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'OversizedDataError';
  corrupted['error.message'] = 'Field exceeds maximum length';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 4. Invalid field values - Wrong types or out-of-range values.
 */
export function applyInvalidFields(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  const corruptionType = Math.floor(Math.random() * 5);

  switch (corruptionType) {
    case 0:
      // Invalid status code
      corrupted['http.response.status_code'] = 9999;
      break;
    case 1:
      // Negative response bytes
      corrupted['http.response.bytes'] = -1000;
      break;
    case 2:
      // Invalid IP address
      corrupted['client.ip'] = '999.999.999.999';
      break;
    case 3:
      // Future timestamp (1 year ahead)
      corrupted['@timestamp'] = Date.now() + 365 * 24 * 60 * 60 * 1000;
      break;
    case 4:
      // Invalid geo coordinates
      if (!corrupted['host.geo.location']) {
        corrupted['host.geo.location'] = [];
      }
      corrupted['host.geo.location'] = [999, 999]; // Invalid lat/lon
      break;
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'InvalidFieldError';
  corrupted['error.message'] = 'Field contains invalid value';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 5. Special characters and encoding issues.
 */
export function applySpecialChars(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  const specialChars = [
    '\u0000', // Null character
    '\uFFFD', // Replacement character
    '\u200B', // Zero-width space
    '\u202E', // Right-to-left override
    '💩', // Emoji
    '🔥',
    '\\x00\\x01',
    '<script>alert(1)</script>',
    "'; DROP TABLE logs;--",
    '../../../etc/passwd',
  ];

  const specialChar = getRandomItem(specialChars);

  // Inject into random field
  const targetField = getRandomItem(['url.path', 'user_agent.name', 'message', 'hostname']);

  switch (targetField) {
    case 'url.path':
      corrupted['url.path'] = `/api/${specialChar}/resource`;
      break;
    case 'user_agent.name':
      corrupted['user_agent.name'] = `Mozilla/5.0 ${specialChar}`;
      break;
    case 'message':
      if (corrupted.message) {
        corrupted.message = corrupted.message + ' ' + specialChar;
      }
      break;
    case 'hostname':
      corrupted.hostname = `host${specialChar}.example.com`;
      break;
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'EncodingError';
  corrupted['error.message'] = 'Invalid or unsupported characters detected';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 6. Timestamp anomalies - Past dates, future dates, or invalid formats.
 */
export function applyTimestampAnomaly(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  const anomalyType = Math.floor(Math.random() * 4);

  switch (anomalyType) {
    case 0:
      // Very old timestamp (10 years ago)
      corrupted['@timestamp'] = Date.now() - 10 * 365 * 24 * 60 * 60 * 1000;
      break;
    case 1:
      // Future timestamp (1 year ahead)
      corrupted['@timestamp'] = Date.now() + 365 * 24 * 60 * 60 * 1000;
      break;
    case 2:
      // Unix epoch (1970-01-01)
      corrupted['@timestamp'] = 0;
      break;
    case 3:
      // Millisecond precision issues (microseconds added)
      corrupted['@timestamp'] = Date.now() + Math.random();
      break;
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'TimestampAnomalyError';
  corrupted['error.message'] = 'Timestamp outside expected range';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 7. Duplicate events - Same event with identical or nearly identical data.
 * Note: This is a marker; actual duplication happens in the generator.
 */
export function markAsDuplicate(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'DuplicateEventError';
  corrupted['error.message'] = 'Duplicate event detected';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * 8. Null or empty required fields.
 */
export function applyNullRequired(logData: Partial<LogDocument>): Partial<LogDocument> {
  const corrupted = { ...logData };

  // Remove or nullify critical fields
  const targetField = getRandomItem([
    'http.response.status_code',
    'http.request.method',
    'client.ip',
    'url.path',
  ]);

  switch (targetField) {
    case 'http.response.status_code':
      delete corrupted['http.response.status_code'];
      break;
    case 'http.request.method':
      delete corrupted['http.request.method'];
      break;
    case 'client.ip':
      corrupted['client.ip'] = '';
      break;
    case 'url.path':
      corrupted['url.path'] = '';
      break;
  }

  // Mark as malformed using ECS fields
  corrupted['error.type'] = 'MissingRequiredFieldError';
  corrupted['error.message'] = 'Required field is null or empty';
  corrupted['event.outcome'] = 'failure';

  return corrupted;
}

/**
 * Apply a random malformation to log data.
 */
export function applyMalformation(logData: Partial<LogDocument>): Partial<LogDocument> {
  if (!shouldApplyMalformation()) {
    return logData;
  }

  const malformationType = selectMalformationType();

  switch (malformationType) {
    case MalformationType.INVALID_JSON:
      return applyInvalidJSON(logData);
    case MalformationType.TRUNCATED:
      return applyTruncation(logData);
    case MalformationType.LONG_VALUES:
      return applyLongValues(logData);
    case MalformationType.INVALID_FIELDS:
      return applyInvalidFields(logData);
    case MalformationType.SPECIAL_CHARS:
      return applySpecialChars(logData);
    case MalformationType.TIMESTAMP_ANOMALY:
      return applyTimestampAnomaly(logData);
    case MalformationType.DUPLICATE:
      return markAsDuplicate(logData);
    case MalformationType.NULL_REQUIRED:
      return applyNullRequired(logData);
    default:
      return logData;
  }
}

/**
 * Check if log data is marked as malformed.
 */
export function isMalformed(logData: Partial<LogDocument>): boolean {
  return !!logData['error.type'] && logData['event.outcome'] === 'failure';
}

/**
 * Get malformation type from log data.
 */
export function getMalformationType(logData: Partial<LogDocument>): string | undefined {
  return logData['error.type'];
}
