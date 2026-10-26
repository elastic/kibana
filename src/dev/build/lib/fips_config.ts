/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const FIPS_BASE_IMAGE =
  'docker.elastic.co/wolfi/chainguard-base-fips:latest@sha256:9408b8197ab1562783e6c7171134130a889a73693b0387358d5060974711a565';

export const OPENSSL_FIPS_VERSION = '3.1.2';
export const OPENSSL_FIPS_SOURCE_URL = `https://github.com/openssl/openssl/releases/download/openssl-${OPENSSL_FIPS_VERSION}/openssl-${OPENSSL_FIPS_VERSION}.tar.gz`;
export const OPENSSL_FIPS_SOURCE_SHA256 =
  'a0ce69b8b97ea6a35b96875235aa453b966ba3cba8af2de23657d8b6767d6539';
export const OPENSSL_FIPS_CERTIFICATE_URL =
  'https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/4985';
export const OPENSSL_FIPS_SECURITY_POLICY_URL =
  'https://csrc.nist.gov/CSRC/media/projects/cryptographic-module-validation-program/documents/security-policies/140sp4985.pdf';
export const OPENSSL_FIPS_BUILD_IMAGE =
  'debian:bullseye-slim@sha256:e5b6442dd2e9684cf5e87d8338b5968f3b348636fc0be6d7850a381e3731a2bd';
