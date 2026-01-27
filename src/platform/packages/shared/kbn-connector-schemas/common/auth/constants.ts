/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export enum AuthType {
  Basic = 'webhook-authentication-basic',
  SSL = 'webhook-authentication-ssl',
  OAuth2ClientCredentials = 'webhook-oauth2-client-credentials',
}

export enum SSLCertType {
  CRT = 'ssl-crt-key',
  PFX = 'ssl-pfx',
}

export enum WebhookMethods {
  PATCH = 'patch',
  DELETE = 'delete',
  POST = 'post',
  PUT = 'put',
  GET = 'get',
}

export const MAX_HEADERS: number = 20;
