/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestGroupRunOrderResponse } from '../client';

export type RunGroup = TestGroupRunOrderResponse['types'][0];

export interface FtrConfigsManifest {
  defaultQueue?: string;
  disabled?: string[];
  enabled?: Array<string | { [configPath: string]: { queue: string } }>;
}

export interface FunctionalGroup {
  title: string;
  key: string;
  sortBy: number | string;
  queue: string;
}

export interface FtrRunOrderEntry {
  title: string;
  expectedDurationMin: number;
  names: string[];
}

export type FtrRunOrder = Record<string, FtrRunOrderEntry>;
