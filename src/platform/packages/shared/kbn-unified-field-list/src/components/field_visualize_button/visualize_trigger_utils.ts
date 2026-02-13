/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type { AggregateQuery } from '@kbn/es-query';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  VISUALIZE_GEO_FIELD_TRIGGER,
  VISUALIZE_FIELD_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers } from '@kbn/ui-actions-plugin/public';

export function getTriggerConstant(type: string) {
  return type === KBN_FIELD_TYPES.GEO_POINT || type === KBN_FIELD_TYPES.GEO_SHAPE
    ? VISUALIZE_GEO_FIELD_TRIGGER
    : VISUALIZE_FIELD_TRIGGER;
}

function getTrigger(type: string) {
  return type === KBN_FIELD_TYPES.GEO_POINT || type === KBN_FIELD_TYPES.GEO_SHAPE
    ? triggers[VISUALIZE_GEO_FIELD_TRIGGER]
    : triggers[VISUALIZE_FIELD_TRIGGER];
}

async function getCompatibleActions(
  uiActions: UiActionsStart,
  fieldName: string,
  dataView: DataView,
  contextualFields: string[] = [],
  trigger: typeof VISUALIZE_FIELD_TRIGGER | typeof VISUALIZE_GEO_FIELD_TRIGGER
) {
  const compatibleActions = await uiActions.getTriggerCompatibleActions(trigger, {
    dataViewSpec: dataView.toSpec(false),
    fieldName,
    contextualFields,
  });
  return compatibleActions;
}

export function triggerVisualizeActions(
  uiActions: UiActionsStart,
  field: DataViewField,
  contextualFields: string[] = [],
  originatingApp: string,
  dataView?: DataView
) {
  if (!dataView) return;
  const trigger = getTriggerConstant(field.type);
  const triggerOptions = {
    dataViewSpec: dataView.toSpec(false),
    fieldName: field.name,
    contextualFields,
    originatingApp,
  };
  uiActions.executeTriggerActions(trigger, triggerOptions);
}

export function triggerVisualizeActionsTextBasedLanguages(
  uiActions: UiActionsStart,
  contextualFields: string[],
  originatingApp: string,
  dataView?: DataView,
  query?: AggregateQuery
) {
  if (!dataView) return;
  const triggerOptions = {
    dataViewSpec: dataView.toSpec(false),
    fieldName: '',
    contextualFields,
    originatingApp,
    query,
  };
  uiActions.executeTriggerActions(VISUALIZE_FIELD_TRIGGER, triggerOptions);
}

export interface VisualizeInformation {
  field: DataViewField;
  href?: string;
}

/**
 * Returns the field name and potentially href of the field or the first multi-field
 * that has a compatible visualize uiAction.
 */
export async function getVisualizeInformation(
  uiActions: UiActionsStart,
  field: DataViewField,
  dataView: DataView | undefined,
  contextualFields: string[] = [],
  multiFields: DataViewField[] = []
): Promise<VisualizeInformation | undefined> {
  if (field.name === '_id' || !dataView?.id) {
    // _id fields are not visualizeable in ES
    return undefined;
  }

  for (const f of [field, ...multiFields]) {
    if (!f.visualizable) {
      continue;
    }
    // Retrieve compatible actions for the specific field
    const actions = await getCompatibleActions(
      uiActions,
      f.name,
      dataView,
      contextualFields,
      getTriggerConstant(f.type)
    );

    // if the field has compatible actions use this field for visualizing
    if (actions.length > 0) {
      const triggerOptions = {
        dataViewSpec: dataView?.toSpec(false),
        fieldName: f.name,
        contextualFields,
        trigger: getTrigger(f.type),
      };

      return {
        field: f,
        // We use the href of the first action always. Multiple actions will only work
        // via the modal shown by triggerVisualizeActions that should be called via onClick.
        href: await actions[0].getHref?.(triggerOptions),
      };
    }
  }

  return undefined;
}
