/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
  visualizeFieldTrigger,
  visualizeGeoFieldTrigger,
} from '../../../../../../ui_actions/public';
import { getUiActions } from '../../../../kibana_services';
import { IndexPatternField, KBN_FIELD_TYPES } from '../../../../../../data/public';

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

export async function getVisualizeHref(
  field: IndexPatternField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (!indexPatternId) return undefined;
  const triggerOptions = {
    indexPatternId,
    fieldName: field.name,
    contextualFields,
    trigger: getTrigger(field.type),
  };
  const compatibleActions = await getCompatibleActions(
    field.name,
    indexPatternId,
    contextualFields,
    getTriggerConstant(field.type)
  );
  // enable the link only if only one action is registered
  return compatibleActions.length === 1
    ? compatibleActions[0].getHref?.(triggerOptions)
    : undefined;
}

export function triggerVisualizeActions(
  field: IndexPatternField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (!indexPatternId) return;
  const trigger = getTriggerConstant(field.type);
  const triggerOptions = {
    indexPatternId,
    fieldName: field.name,
    contextualFields,
  };
  getUiActions().getTrigger(trigger).exec(triggerOptions);
}

export async function isFieldVisualizable(
  field: IndexPatternField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (field.name === '_id' || !indexPatternId) {
    // for first condition you'd get a 'Fielddata access on the _id field is disallowed' error on ES side.
    return false;
  }
  const trigger = getTriggerConstant(field.type);
  const compatibleActions = await getCompatibleActions(
    field.name,
    indexPatternId,
    contextualFields,
    trigger
  );
  return compatibleActions.length > 0 && field.visualizable;
}
