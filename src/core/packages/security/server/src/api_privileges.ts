/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ApiOperation {
  Read = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Manage = 'manage',
}

export class ApiPrivileges {
  public static manage(subject: string) {
    return `${ApiOperation.Manage}_${subject}`;
  }

  public static read(subject: string) {
    return `${ApiOperation.Read}_${subject}`;
  }

  public static create(subject: string) {
    return `${ApiOperation.Create}_${subject}`;
  }

  public static update(subject: string) {
    return `${ApiOperation.Update}_${subject}`;
  }

  public static delete(subject: string) {
    return `${ApiOperation.Delete}_${subject}`;
  }
}
