/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { BehaviorSubject } from 'rxjs';
import type { CanAddNewPanel } from '@kbn/presentation-containers';
import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { type ESQLControlState, apiPublishesESQLVariables } from '@kbn/esql-types';
import type { ControlPanelsState } from '@kbn/controls-plugin/public';
import { type ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import { ESQL_CONTROL } from '@kbn/controls-constants';

export const addControlsFromSavedSession = (
  container: CanAddNewPanel & { controlGroupApi$?: unknown; esqlVariables$?: unknown },
  savedObject: SavedObjectCommon<FinderAttributes>
): void => {
  const savedSessionAttributes = savedObject.attributes as SavedSearchAttributes;
  if (
    !savedSessionAttributes.controlGroupJson ||
    Object.keys(savedSessionAttributes.controlGroupJson).length === 0
  ) {
    return;
  }

  const controlsState = JSON.parse(
    savedSessionAttributes.controlGroupJson
  ) as ControlPanelsState<ESQLControlState>;

  if (!apiPublishesESQLVariables(container) || !('controlGroupApi$' in container)) {
    return;
  }

  const esqlVariables$ = container.esqlVariables$;
  const esqlVariables = esqlVariables$?.getValue();
  const controlGroupApi$ = container.controlGroupApi$ as BehaviorSubject<ControlGroupRendererApi>;
  const controlGroupApi = controlGroupApi$.getValue();

  // Only add controls whose variableName exists in current esqlVariables
  Object.values(controlsState).forEach((panel) => {
    const variableName = panel.variableName;
    const variableExists = esqlVariables?.some((esqlVar) => esqlVar.key === variableName);
    if (!variableExists) {
      controlGroupApi.addNewPanel({
        panelType: ESQL_CONTROL,
        serializedState: {
          rawState: {
            ...panel,
          },
        },
      });
    }
  });
};
