/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateAWSA4Signature, sha256Hash } from './aws_crypto_helpers';

/**
 * Bearer tokens for Amazon EKS are presigned AWS STS `GetCallerIdentity`
 * requests, encoded as `k8s-aws-v1.<base64url(presigned URL)>`. The cluster
 * name is bound into the signature via the signed `x-k8s-aws-id` header, and
 * the API server verifies the token by executing the presigned call.
 *
 * This mirrors what `aws eks get-token` / aws-iam-authenticator produce
 * (see https://github.com/kubernetes-sigs/aws-iam-authenticator). The server
 * accepts a token for up to 15 minutes from its `X-Amz-Date`; we mint a fresh
 * one for every action execution, so it is always seconds old when used.
 */

const TOKEN_PREFIX = 'k8s-aws-v1.';
const STS_ACTION = 'GetCallerIdentity';
const STS_API_VERSION = '2011-06-15';
const SIGNING_ALGORITHM = 'AWS4-HMAC-SHA256';
const STS_SERVICE = 'sts';
const CLUSTER_ID_HEADER = 'x-k8s-aws-id';
// Matches the reference implementation's presign window (`requestPresignParam`).
const PRESIGN_EXPIRES_SECONDS = 60;
const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const base64urlEncode = (value: string): string =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export interface EksTokenParams {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  clusterName: string;
}

export async function buildEksBearerToken({
  accessKeyId,
  secretAccessKey,
  region,
  clusterName,
}: EksTokenParams): Promise<string> {
  const host = `sts.${region}.amazonaws.com`;
  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const credentialScope = `${dateStamp}/${region}/${STS_SERVICE}/aws4_request`;
  const signedHeaders = `host;${CLUSTER_ID_HEADER}`;

  const queryParams: Record<string, string> = {
    Action: STS_ACTION,
    Version: STS_API_VERSION,
    'X-Amz-Algorithm': SIGNING_ALGORITHM,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(PRESIGN_EXPIRES_SECONDS),
    'X-Amz-SignedHeaders': signedHeaders,
  };

  const canonicalQuerystring = Object.keys(queryParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n${CLUSTER_ID_HEADER}:${clusterName}\n`;

  const canonicalRequest = [
    'GET',
    '/',
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    EMPTY_BODY_SHA256,
  ].join('\n');

  const stringToSign = [
    SIGNING_ALGORITHM,
    amzDate,
    credentialScope,
    await sha256Hash(canonicalRequest),
  ].join('\n');

  const signature = await calculateAWSA4Signature(
    secretAccessKey,
    dateStamp,
    region,
    STS_SERVICE,
    stringToSign
  );

  const presignedUrl = `https://${host}/?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

  return `${TOKEN_PREFIX}${base64urlEncode(presignedUrl)}`;
}
