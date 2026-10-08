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
import { omit } from 'lodash';

export const INITIAL_HISTORY_SEQUENCE = 1;

/**
 * Next history sequence for an update: bumped only when the stored content (attributes or
 * references) changes, otherwise the existing sequence is preserved. Legacy dashboards without
 * a sequence start at the initial value.
 */
export const getNextHistorySequence = (
  existing: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>,
  next: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>
): number => {
  const { historySequence: existingSequence, ...existingAttributes } = existing.attributes;
  const hasChanged =
    !equal(existingAttributes, omit(next.attributes, 'historySequence')) ||
    !equal(existing.references, next.references);

  if (existingSequence == null) return INITIAL_HISTORY_SEQUENCE;
  return hasChanged ? existingSequence + 1 : existingSequence;
};
