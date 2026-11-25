/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { GoogleWorkspaceAdmin } from '../google_workspace_admin';
import { REQUEST_TIMEOUT_MS } from '../client';

/** Shared fixtures for the Google Workspace Admin connector tests (not a test file itself). */
export const API_URL = 'https://admin.googleapis.com';
export const DIRECTORY = `${API_URL}/admin/directory/v1`;
export const REPORTS = `${API_URL}/admin/reports/v1`;

export const httpError = (
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {}
) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers, statusText: '' },
  });

/** Google's standard error envelope. */
export const googleError = (status: number, message: string, reason?: string) =>
  httpError(status, {
    error: {
      code: status,
      message,
      ...(reason ? { errors: [{ reason, message, domain: 'global' }] } : {}),
    },
  });

export const createContext = (
  config: Record<string, unknown> = {},
  secrets: Record<string, unknown> = { authType: 'bearer', token: 'ya29.test-token' }
) => {
  const request = jest.fn();
  const debug = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets,
    log: { debug, error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request, debug };
};

export const run = (
  name: keyof typeof GoogleWorkspaceAdmin.actions,
  ctx: ActionContext,
  input: unknown
) => {
  const action = GoogleWorkspaceAdmin.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** Whether the action's input schema accepts the input. */
export const accepts = (name: keyof typeof GoogleWorkspaceAdmin.actions, input: unknown) =>
  GoogleWorkspaceAdmin.actions[name].input.safeParse(input).success;

/** The request config the handler sent, without the fixed timeout and redirect settings. */
export const sent = (request: jest.Mock, call = 0) => {
  const { timeout, maxRedirects, ...rest } = request.mock.calls[call][0];
  expect(timeout).toBe(REQUEST_TIMEOUT_MS);
  expect(maxRedirects).toBe(0);
  return rest;
};

export const USER = {
  kind: 'admin#directory#user',
  etag: '"etag-1"',
  id: '104512345678901234567',
  primaryEmail: 'jdoe@example.com',
  name: { givenName: 'Jane', familyName: 'Doe', fullName: 'Jane Doe' },
  isAdmin: false,
  isDelegatedAdmin: false,
  lastLoginTime: '2026-11-20T08:15:00.000Z',
  creationTime: '2024-01-10T10:00:00.000Z',
  suspended: false,
  archived: false,
  changePasswordAtNextLogin: false,
  orgUnitPath: '/Sales',
  isEnrolledIn2Sv: true,
  isEnforcedIn2Sv: false,
  recoveryEmail: 'jane.personal@example.net',
  recoveryPhone: '+16505550100',
  emails: [{ address: 'jdoe@example.com', primary: true }],
};
