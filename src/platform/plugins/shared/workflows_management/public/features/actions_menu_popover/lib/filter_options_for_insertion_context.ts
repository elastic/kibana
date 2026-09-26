/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionOptionData, ActionsMenuInsertionContext } from '../types';
import { isActionGroup } from '../types';

const TRIGGERS_GROUP_ID = 'triggers';
const FLOW_CONTROL_GROUP_ID = 'flowControl';

/** Remove trigger leaves whose ids are in `disabledTriggerIds` (e.g. Manual once one exists). */
export const omitDisabledTriggers = (
  options: ActionOptionData[],
  disabledTriggerIds: readonly string[] | undefined
): ActionOptionData[] => {
  if (!disabledTriggerIds?.length) return options;
  const disabled = new Set(disabledTriggerIds);
  return options.map((opt) => {
    if (opt.id !== TRIGGERS_GROUP_ID || !isActionGroup(opt)) return opt;
    return { ...opt, options: opt.options.filter((leaf) => !disabled.has(leaf.id)) };
  });
};

/**
 * Filters the shared Actions catalog for an insertion context.
 * One function for the full menu and the compact popover — never fork lists.
 *
 * - `trigger`: only the Triggers group's leaves; hides `disabledTriggerIds`
 * - `step`: hide Triggers
 * - `error`: hide Triggers and Flow control (same as canvas error-port eligibility)
 */
export const filterOptionsForInsertionContext = (
  options: ActionOptionData[],
  context: ActionsMenuInsertionContext | undefined
): ActionOptionData[] => {
  if (!context) return options;

  if (context.mode === 'trigger') {
    const withDisabledOmitted = omitDisabledTriggers(options, context.disabledTriggerIds);
    const triggers = withDisabledOmitted.find((o) => o.id === TRIGGERS_GROUP_ID);
    return triggers && isActionGroup(triggers) ? triggers.options : [];
  }

  const withoutTriggers = options.filter((o) => o.id !== TRIGGERS_GROUP_ID);
  if (context.mode === 'error') {
    return withoutTriggers.filter((o) => o.id !== FLOW_CONTROL_GROUP_ID);
  }
  return withoutTriggers;
};
