/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Idira } from './idira';
import { REQUEST_TIMEOUT_MS } from './client';

/** Shared fixtures for the Idira connector tests (not a test file itself). */
export const API_URL = 'https://acme.privilegecloud.cyberark.cloud';
export const BASE = `${API_URL}/PasswordVault/API`;

export const httpError = (
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {}
) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers, statusText: '' },
  });

export const createContext = () => {
  const request = jest.fn();
  const debug = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    secrets: {
      authType: 'oauth_client_credentials',
      tokenUrl: 'https://abc1234.id.cyberark.cloud/oauth2/platformtoken',
      clientId: 'svc-kibana@acme',
      clientSecret: 'client-secret',
    },
    log: { debug, error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request, debug };
};

export const run = (name: keyof typeof Idira.actions, ctx: ActionContext, input: unknown) => {
  const action = Idira.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** The request config the handler sent, without the fixed timeout and redirect settings. */
export const sent = (request: jest.Mock, call = 0) => {
  const { timeout, maxRedirects, ...rest } = request.mock.calls[call][0];
  expect(timeout).toBe(REQUEST_TIMEOUT_MS);
  expect(maxRedirects).toBe(0);
  return rest;
};

export const ACCOUNT = {
  id: '12_3',
  name: 'Operating System-WinServerLocal-10.0.0.5-svc-backup',
  address: '10.0.0.5',
  userName: 'svc-backup',
  platformId: 'WinServerLocal',
  safeName: 'SOC-Servers',
  secretType: 'password',
  platformAccountProperties: { LogonDomain: 'corp' },
  secretManagement: {
    automaticManagementEnabled: true,
    status: 'succeeded',
    lastModifiedTime: 1760000000,
    lastReconciledTime: 1755000000,
    lastVerifiedTime: 1759900000,
  },
  createdTime: 1750000000,
};
