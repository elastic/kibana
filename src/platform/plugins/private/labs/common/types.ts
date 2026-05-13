/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HELLO_WORLD_LAB_ID } from './lab_apps/hello_world';

export const LAB_IDS = [HELLO_WORLD_LAB_ID] as const;

export type LabId = (typeof LAB_IDS)[number];

export interface LabsProfileData extends Record<string, unknown> {
  userSettings?: {
    labsInstalledLabIdsJson?: string;
  };
}
