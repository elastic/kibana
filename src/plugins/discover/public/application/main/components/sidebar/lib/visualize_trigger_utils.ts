/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
  visualizeFieldTrigger,
  visualizeGeoFieldTrigger,
} from '../../../../../../../ui_actions/public';
import { getUiActions } from '../../../../../kibana_services';
import type { DataViewField } from '../../../../../../../data_views/public';
import { KBN_FIELD_TYPES } from '../../../../../../../data/public';
import { APP_ID } from '../../../../../../common';

function getTriggerConstant(type: string) {
  return type === KBN_FIELD_TYPES.GEO_POINT || type === KBN_FIELD_TYPES.GEO_SHAPE
    ? VISUALIZE_GEO_FIELD_TRIGGER
    : VISUALIZE_FIELD_TRIGGER;
}

function getTrigger(type: string) {
  return type === KBN_FIELD_TYPES.GEO_POINT || type === KBN_FIELD_TYPES.GEO_SHAPE
    ? visualizeGeoFieldTrigger
    : visualizeFieldTrigger;
}

async function getCompatibleActions(
  fieldName: string,
  indexPatternId: string,
  contextualFields: string[],
  trigger: typeof VISUALIZE_FIELD_TRIGGER | typeof VISUALIZE_GEO_FIELD_TRIGGER
) {
  const compatibleActions = await getUiActions().getTriggerCompatibleActions(trigger, {
    indexPatternId,
    fieldName,
    contextualFields,
  });
  return compatibleActions;
}

export function triggerVisualizeActions(
  field: DataViewField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (!indexPatternId) return;
  const trigger = getTriggerConstant(field.type);
  const triggerOptions = {
    indexPatternId,
    fieldName: field.name,
    contextualFields,
    originatingApp: APP_ID,
  };
  getUiActions().getTrigger(trigger).exec(triggerOptions);
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
  field: DataViewField,
  indexPatternId: string | undefined,
  contextualFields: string[],
  multiFields: DataViewField[] = []
): Promise<VisualizeInformation | undefined> {
  if (field.name === '_id' || !indexPatternId) {
    // _id fields are not visualizeable in ES
    return undefined;
  }

  for (const f of [field, ...multiFields]) {
    if (!f.visualizable) {
      continue;
    }
    // Retrieve compatible actions for the specific field
    const actions = await getCompatibleActions(
      f.name,
      indexPatternId,
      contextualFields,
      getTriggerConstant(f.type)
    );

    // if the field has compatible actions use this field for visualizing
    if (actions.length > 0) {
      const triggerOptions = {
        indexPatternId,
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
