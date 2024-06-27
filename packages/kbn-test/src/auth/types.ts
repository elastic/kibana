/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

export interface CloudSamlSessionParams {
  kbnHost: string;
  kbnVersion: string;
  email: string;
  password: string;
  log: ToolingLog;
}

export interface LocalSamlSessionParams {
  kbnHost: string;
  email: string;
  username: string;
  fullname: string;
  role: string;
  log: ToolingLog;
}

export interface CreateSamlSessionParams {
  hostname: string;
  email: string;
  password: string;
  log: ToolingLog;
}

export interface SAMLResponseValueParams {
  location: string;
  ecSession: string;
  email: string;
  kbnHost: string;
  log: ToolingLog;
}

export interface User {
  readonly email: string;
  readonly password: string;
}

export type Role = string;

export interface UserProfile {
  username: string;
  roles: string[];
  full_name: string;
  email: string;
  enabled: boolean;
  elastic_cloud_user: boolean;
}

export interface RetryParams {
  attemptsCount: number;
  attemptDelay: number;
}
