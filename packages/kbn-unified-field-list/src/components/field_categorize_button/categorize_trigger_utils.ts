/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { CATEGORIZE_FIELD_TRIGGER, type CategorizeFieldContext } from '@kbn/ml-ui-actions';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';

async function getCompatibleActions(
  uiActions: UiActionsStart,
  field: DataViewField,
  dataView: DataView,
  trigger: typeof CATEGORIZE_FIELD_TRIGGER
) {
  const compatibleActions = await uiActions.getTriggerCompatibleActions(trigger, {
    dataView,
    field,
  });
  return compatibleActions;
}

export function triggerCategorizeActions(
  uiActions: UiActionsStart,
  field: DataViewField,
  originatingApp: string,
  dataView?: DataView
) {
  if (!dataView) return;
  const triggerOptions: CategorizeFieldContext = {
    dataView,
    field,
    originatingApp,
  };
  uiActions.getTrigger(CATEGORIZE_FIELD_TRIGGER).exec(triggerOptions);
}

export async function canCategorize(
  uiActions: UiActionsStart,
  field: DataViewField,
  dataView: DataView | undefined
): Promise<boolean> {
  if (
    field.name === '_id' ||
    !dataView?.id ||
    !dataView.isTimeBased() ||
    !field.esTypes?.includes('text')
  ) {
    return false;
  }

  const actions = await getCompatibleActions(uiActions, field, dataView, CATEGORIZE_FIELD_TRIGGER);

  return actions.length > 0;
}
