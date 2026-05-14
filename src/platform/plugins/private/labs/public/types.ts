/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { LabId } from '../common';
import type { InstalledLabsService } from './services/installed_labs_service';

export type LabUnmount = () => void;

export interface LabDefinition {
  id: LabId;
  appId: string;
  order: number;
  euiIconType: string;
  title: string;
  description: string;
  mount: (args: {
    coreStart: CoreStart;
    params: AppMountParameters;
    installedLabsService: InstalledLabsService;
  }) => Promise<LabUnmount>;
}
