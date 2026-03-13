/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateAWSA4Signature, sha256Hash } from './aws_crypto_helpers';

const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Parse an AWS hostname into service and region.
 * Supports: {service}.{region}.amazonaws.com
 */
export function parseAwsHost(
  hostname: string
): { service: string; region: string; itemName?: string } | null {
  if (!hostname.endsWith('.amazonaws.com')) {
    return null;
  }
  const parts = hostname.replace('.amazonaws.com', '').split('.');
  if (parts.length < 2) {
    return null;
  }

  if (parts.length === 2) {
    return { service: parts[0], region: parts[1] };
  }

  // Handle item-specific hostnames like {bucket}.s3.{region}.amazonaws.com
  return { itemName: parts[0], service: parts[1], region: parts[2] };
}

/**
 * Sign an AWS request with SigV4.
 * Automatically collects x-amz-* headers for signing (AWS requires them signed).
 */
export async function signRequest(
  method: string,
  host: string,
  path: string,
  queryParams: Record<string, string>,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string,
  existingHeaders: Record<string, string>,
  body?: string
): Promise<Record<string, string>> {
  const algorithm = 'AWS4-HMAC-SHA256';
  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const sortedParams = Object.keys(queryParams).sort();
  const canonicalQuerystring = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const hasBody = body !== undefined && body !== '';
  const payloadHash = hasBody ? await sha256Hash(body) : EMPTY_BODY_SHA256;

  // Build canonical headers: host + content-type (if body) + x-amz-date + any existing x-amz-* headers
  const headersToSign: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
  };

  if (hasBody) {
    headersToSign['content-type'] = 'application/json';
  }

  // Include any x-amz-* headers set by the action handler (AWS requires them signed)
  for (const [key, value] of Object.entries(existingHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('x-amz-') && lowerKey !== 'x-amz-date') {
      headersToSign[lowerKey] = value;
    }
  }

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hash(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');

  const signature = await calculateAWSA4Signature(
    secretAccessKey,
    dateStamp,
    region,
    service,
    stringToSign
  );

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const result: Record<string, string> = {
    Host: host,
    'X-Amz-Date': amzDate,
    Authorization: authorizationHeader,
  };

  // if it's an S3 request, we need the "x-amz-content-sha256" header to be set
  if (service === 's3') {
    result['x-amz-content-sha256'] = payloadHash;
  }

  if (hasBody) {
    result['Content-Type'] = 'application/json';
  }

  return result;
}
