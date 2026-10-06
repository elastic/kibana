/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppDeepLinkLocations } from '@kbn/core/public';
import type { CreateManagementItemArgs } from '../types';
export declare class ManagementItem {
  readonly id: string;
  readonly title: string;
  readonly tip?: string;
  readonly order: number;
  readonly hideFromSidebar?: boolean;
  readonly hideFromGlobalSearch?: boolean;
  readonly visibleIn?: AppDeepLinkLocations[];
  readonly euiIconType?: string;
  readonly icon?: string;
  readonly capabilitiesId?: string;
  readonly redirectFrom?: string;
  enabled: boolean;
  constructor({
    id,
    title,
    tip,
    order,
    hideFromSidebar,
    hideFromGlobalSearch,
    visibleIn,
    euiIconType,
    icon,
    capabilitiesId,
    redirectFrom,
  }: CreateManagementItemArgs);
  disable(): void;
  enable(): void;
}
