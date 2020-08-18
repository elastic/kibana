/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
