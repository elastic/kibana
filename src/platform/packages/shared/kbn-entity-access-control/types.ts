/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type AccessControlMode = 'private' | 'public';

export interface AccessControlEntryInput<Role extends string = string> {
  type: 'user';
  id: string;
  role: Role;
}

export interface AccessControlEntry<Role extends string = string>
  extends AccessControlEntryInput<Role> {
  added_at: string;
}

export interface AccessControl<Role extends string = string> {
  access_mode: AccessControlMode;
  entries: Array<AccessControlEntry<Role>>;
}

export interface AccessControlInput<Role extends string = string> {
  access_mode: AccessControlMode;
  entries?: Array<AccessControlEntryInput<Role>>;
}
