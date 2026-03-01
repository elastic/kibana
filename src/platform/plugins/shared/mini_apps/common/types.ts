/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A saved snapshot of a mini app's code at a point in time.
 */
export interface MiniAppVersion {
  script_code: string;
  saved_at: string;
  message?: string;
}

/**
 * Attributes stored in the mini-app saved object
 */
export interface MiniAppAttributes {
  name: string;
  script_code: string;
  created_at: string;
  updated_at: string;
  versions?: MiniAppVersion[];
}

/**
 * Mini app with its ID from saved object
 */
export interface MiniApp {
  id: string;
  name: string;
  script_code: string;
  created_at: string;
  updated_at: string;
  versions: MiniAppVersion[];
}

/**
 * Request body for creating a mini app
 */
export interface CreateMiniAppRequest {
  name: string;
  script_code: string;
}

/**
 * Request body for updating a mini app
 */
export interface UpdateMiniAppRequest {
  name?: string;
  script_code?: string;
  /** Optional message describing what changed in this version */
  version_message?: string;
}
