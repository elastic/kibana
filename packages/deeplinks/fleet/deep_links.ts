/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const FLEET_APP_ID = 'fleet';

export type AppId = typeof FLEET_APP_ID;

export type LinkId =
  | 'agents'
  | 'policies'
  | 'enrollment_tokens'
  | 'uninstall_tokens'
  | 'data_streams'
  | 'settings';

export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
