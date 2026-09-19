/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

export interface SanitizeImportJsonResult<SanitizedState> {
  data: SanitizedState;
  warnings: string[];
  relatedItems?: AsCodeRelatedItem[];
  relatedItemsCount?: number;
}

export type SanitizeImportJson<SanitizedState> = (
  raw: unknown,
  signal?: AbortSignal
) => Promise<SanitizeImportJsonResult<SanitizedState>>;

export interface CreateFromJsonResult {
  id: string;
  title: string;
}

export type CreateFromJson<SanitizedState> = (
  data: SanitizedState
) => Promise<CreateFromJsonResult>;

export interface ImportJsonFlyoutServices {
  application: ApplicationStart;
  notifications: NotificationsStart;
}
