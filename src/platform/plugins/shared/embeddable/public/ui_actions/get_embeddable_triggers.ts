/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasSupportedTriggers } from '@kbn/presentation-publishing';
import {
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

export function getEmbeddableTriggers(embeddable: HasSupportedTriggers) {
  return [CONTEXT_MENU_TRIGGER, ...ensureNestedTriggers(embeddable.supportedTriggers())];
}

/**
 * We know that VALUE_CLICK_TRIGGER and SELECT_RANGE_TRIGGER are also triggering APPLY_FILTER_TRIGGER.
 * This function appends APPLY_FILTER_TRIGGER to the list of triggers if either VALUE_CLICK_TRIGGER
 * or SELECT_RANGE_TRIGGER was executed.
 *
 * TODO: this probably should be part of uiActions infrastructure,
 * but dynamic implementation of nested trigger doesn't allow to statically express such relations
 *
 * @param triggers
 */
function ensureNestedTriggers(triggers: string[]): string[] {
  if (
    !triggers.includes(APPLY_FILTER_TRIGGER) &&
    (triggers.includes(VALUE_CLICK_TRIGGER) || triggers.includes(SELECT_RANGE_TRIGGER))
  ) {
    return [...triggers, APPLY_FILTER_TRIGGER];
  }

  return triggers;
}
