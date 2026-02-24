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
  ON_APPLY_FILTER,
  ON_OPEN_PANEL_MENU,
  ON_SELECT_RANGE,
  ON_CLICK_VALUE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

export function getEmbeddableTriggers(embeddable: HasSupportedTriggers) {
  return [ON_OPEN_PANEL_MENU, ...ensureNestedTriggers(embeddable.supportedTriggers())];
}

/**
 * We know that ON_CLICK_VALUE and ON_SELECT_RANGE are also triggering ON_APPLY_FILTER.
 * This function appends ON_APPLY_FILTER to the list of triggers if either ON_CLICK_VALUE
 * or ON_SELECT_RANGE was executed.
 *
 * TODO: this probably should be part of uiActions infrastructure,
 * but dynamic implementation of nested trigger doesn't allow to statically express such relations
 *
 * @param triggers
 */
function ensureNestedTriggers(triggers: string[]): string[] {
  if (
    !triggers.includes(ON_APPLY_FILTER) &&
    (triggers.includes(ON_CLICK_VALUE) || triggers.includes(ON_SELECT_RANGE))
  ) {
    return [...triggers, ON_APPLY_FILTER];
  }

  return triggers;
}
