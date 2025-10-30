/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CPSPluginSetup {
  cpsEnabled?: boolean;
}

export interface CPSConfigType {
  cpsEnabled: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CPSServerStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CPSServerStop {}
import type { CPSManager } from './services/cps_manager';

export interface Project {
  _id: string;
  _alias: string;
  _type: string;
  _csp: string;
  _region: string;
  [key: string]: string;
}

// TODO: this is duplicate from src/platform/plugins/shared/cps/server/routes/get_projects_tags.ts we should unify once it is obvious what properties Project has
export interface ProjectTagsResponse {
  origin: Record<string, Project>;
  linked_projects: Record<string, Project>;
}

export interface CPSPluginStart {
  cpsManager?: CPSManager;
}
