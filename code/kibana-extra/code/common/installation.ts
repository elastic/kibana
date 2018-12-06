/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum InstallationType {
  Embed,
  Download,
}

export enum InstallEventType {
  DOWNLOADING,
  UNPACKING,
  DONE,
  FAIL,
}

export interface InstallEvent {
  langServerName: string;
  eventType: InstallEventType;
  progress?: number;
  message?: string;
  params?: any;
}
