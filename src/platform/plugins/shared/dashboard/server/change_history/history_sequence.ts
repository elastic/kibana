/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';

import type { SavedObject } from '@kbn/core-saved-objects-api-server';

import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';

export const INITIAL_HISTORY_SEQUENCE = 1;

/**
 * Whether the stored content (attributes or references) differs between two versions of a dashboard.
 */
export const hasContentChanged = (
  existing: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>,
  next: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>
): boolean =>
  !equal(existing.attributes, next.attributes) || !equal(existing.references, next.references);
