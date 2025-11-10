/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * These types are duplicated from @kbn/cps/public to avoid circular dependencies.
 * The kbn-cps-utils package is used by core (chrome/browser-internal), but @kbn/cps
 * depends on @kbn/core, which would create a circular dependency if kbn-cps-utils
 * referenced @kbn/cps.
 *
 * Keep these types in sync with the types in @kbn/cps/public.
 */

export interface Project {
  _id: string;
  _alias: string;
  _type: string;
  _csp: string;
  _region: string;
  [key: string]: string;
}

export interface CPSManager {
  fetchProjects: () => Promise<{ origin: Project | null; linkedProjects: Project[] }>;
}

export interface CPSPluginStart {
  cpsManager?: CPSManager;
}
