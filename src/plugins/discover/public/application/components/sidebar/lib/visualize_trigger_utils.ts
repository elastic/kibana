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
} from '../../../../../../ui_actions/public';
import { getUiActions, getServices } from '../../../../kibana_services';
import { IndexPatternField, KBN_FIELD_TYPES } from '../../../../../../data/public';
import { DiscoverServices } from '../../../../build_services';

function getTrigger(type: string) {
  return type === KBN_FIELD_TYPES.GEO_POINT || type === KBN_FIELD_TYPES.GEO_SHAPE
    ? VISUALIZE_GEO_FIELD_TRIGGER
    : VISUALIZE_FIELD_TRIGGER;
}

async function getCompatibleActions(
  fieldName: string,
  indexPatternId: string,
  contextualFields: string[],
  action: typeof VISUALIZE_FIELD_TRIGGER | typeof VISUALIZE_GEO_FIELD_TRIGGER
) {
  const compatibleActions = await getUiActions().getTriggerCompatibleActions(action, {
    indexPatternId,
    fieldName,
    contextualFields,
  });
  return compatibleActions;
}

export function triggerVisualizeActions(
  field: IndexPatternField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (!indexPatternId) return;
  const trigger = getTrigger(field.type);
  const triggerOptions = {
    indexPatternId,
    fieldName: field.name,
    contextualFields: trigger === VISUALIZE_GEO_FIELD_TRIGGER ? contextualFields : [],
  };
  getUiActions().getTrigger(trigger).exec(triggerOptions);
}

export async function isFieldVisualizable(
  field: IndexPatternField,
  indexPatternId: string | undefined,
  contextualFields: string[]
) {
  if (!indexPatternId) return;
  if (field.name === '_id') {
    // Else you'd get a 'Fielddata access on the _id field is disallowed' error on ES side.
    return false;
  }
  const trigger = getTrigger(field.type);
  const services: DiscoverServices = getServices();
  const compatibleActions = await getCompatibleActions(
    field.name,
    indexPatternId,
    contextualFields,
    trigger
  );
  return (
    compatibleActions.length > 0 && field.visualizable && !!services.capabilities.visualize.show
  );
}
